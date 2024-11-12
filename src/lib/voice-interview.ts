import { openai } from './openai';
import { AudioService } from './audio-service';
import { DocumentStorage } from './document-storage';
import { EmbeddingsStore } from './embeddings-store';
import type { CVData } from '@/types';

interface InterviewState {
  currentRoleIndex: number;
  questionIndex: number;
  isComplete: boolean;
}

interface ResponseAnalysis {
  summary: string;
  keyPoints: string[];
  skills: string[];
  achievements: string[];
  insights: {
    strengths: string[];
    improvements: string[];
  };
}

export class VoiceInterview {
  private static readonly SYSTEM_PROMPT = `You are an expert technical interviewer analyzing responses. Extract and structure the following:

1. Key technical skills mentioned and proficiency levels
2. Specific achievements with measurable impacts
3. Problem-solving approaches and methodologies
4. Leadership and collaboration examples
5. Areas of strength and potential improvement

Return a concise analysis focusing on concrete examples and metrics.`;

  static getQuestionForRole(role: { role: string; company: string; period: string }, questionIndex: number): string {
    const questions = [
      `During your time as ${role.role} at ${role.company} in ${role.period}, what were the most significant technical challenges you encountered, and how did you approach solving them?`,
      
      `In your role at ${role.company}, can you describe a project that had substantial impact? What metrics or outcomes demonstrated this impact?`,
      
      `How did you collaborate with other teams or stakeholders while at ${role.company}? Please share specific examples of cross-team projects or challenges you handled.`,
      
      `What technical skills did you develop or enhance most during your time as ${role.role}? How did you apply these in practice?`,
      
      `Could you walk me through a complex problem you solved at ${role.company}? I'm interested in your approach from initial analysis through implementation.`
    ];

    return questions[questionIndex] || questions[0];
  }

  static async initializeInterview(userId: string, cvData: CVData): Promise<{ question: string; audioBuffer: ArrayBuffer }> {
    try {
      const state: InterviewState = {
        currentRoleIndex: 0,
        questionIndex: 0,
        isComplete: false
      };

      await DocumentStorage.updateDocument(`interview_states/${userId}`, state);

      const currentRole = cvData.experience[0];
      const question = this.getQuestionForRole(currentRole, 0);
      const audioBuffer = await AudioService.generateSpeech(question);

      return { question, audioBuffer };
    } catch (error) {
      console.error('Error initializing interview:', error);
      throw error;
    }
  }

  static async processAudioQuery(
    audioBlob: Blob,
    userId: string,
    cvData: CVData
  ): Promise<{ response: string; audioBuffer: ArrayBuffer; analysis: ResponseAnalysis }> {
    try {
      const state = await DocumentStorage.getDocument(`interview_states/${userId}`) as InterviewState;
      if (!state || state.isComplete) {
        throw new Error('Interview not initialized or already complete');
      }

      // Transcribe response
      const transcript = await AudioService.transcribeAudio(audioBlob);

      // Get current context
      const currentRole = cvData.experience[state.currentRoleIndex];
      const currentQuestion = this.getQuestionForRole(currentRole, state.questionIndex);

      // Analyze response
      const analysisCompletion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: this.SYSTEM_PROMPT },
          { role: "user", content: `Role: ${currentRole.role} at ${currentRole.company}` },
          { role: "user", content: `Question: ${currentQuestion}` },
          { role: "user", content: `Response: ${transcript}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(analysisCompletion.choices[0]?.message?.content || '{}') as ResponseAnalysis;

      // Store in vector database
      const embedding = await EmbeddingsStore.createEmbedding(
        `Question: ${currentQuestion}\nResponse: ${transcript}\nAnalysis: ${JSON.stringify(analysis)}`
      );

      await EmbeddingsStore.storeEmbedding(transcript, embedding, {
        type: 'interview_response',
        userId,
        roleIndex: state.currentRoleIndex,
        questionIndex: state.questionIndex
      });

      // Update profile with new insights
      const updatedExperience = [...cvData.experience];
      updatedExperience[state.currentRoleIndex] = {
        ...currentRole,
        highlights: [...currentRole.highlights, ...analysis.achievements],
        skills: [...(currentRole.skills || []), ...analysis.skills]
      };

      await DocumentStorage.updateDocument(`users/${userId}`, {
        experience: updatedExperience,
        skills: [...new Set([...cvData.skills, ...analysis.skills])],
        insights: {
          strengths: [...new Set([...cvData.insights.strengths, ...analysis.insights.strengths])],
          improvements: [...new Set([...cvData.insights.improvements, ...analysis.insights.improvements])]
        }
      });

      // Update state
      state.questionIndex++;
      if (state.questionIndex >= 5) {
        state.questionIndex = 0;
        state.currentRoleIndex++;
        
        if (state.currentRoleIndex >= cvData.experience.length) {
          state.isComplete = true;
        }
      }

      await DocumentStorage.updateDocument(`interview_states/${userId}`, state);

      // Get next question
      const nextPrompt = state.isComplete 
        ? "Thank you for sharing your experiences. I've analyzed and updated your profile with the new insights."
        : this.getQuestionForRole(
            cvData.experience[state.currentRoleIndex], 
            state.questionIndex
          );

      const audioBuffer = await AudioService.generateSpeech(nextPrompt);

      return { 
        response: nextPrompt, 
        audioBuffer,
        analysis 
      };
    } catch (error) {
      console.error('Error processing audio query:', error);
      throw error;
    }
  }
}