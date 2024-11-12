import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCV } from '@/context/CVContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { AudioService } from '@/lib/audio-service';
import { toast } from 'sonner';
import { Pause, Play } from 'lucide-react';
import AudioRecorder from './AudioRecorder';

export default function VoiceInterview() {
  const { user } = useAuth();
  const { cvData } = useCV();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentRole, setCurrentRole] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  useEffect(() => {
    const initializeInterview = async () => {
      if (!user?.uid || !cvData) return;

      try {
        const initialized = await AudioService.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize audio service');
        }

        // Set up event listeners for the interview
        AudioService.on('response.done', () => {
          setIsProcessing(false);
          updateProgress();
        });

      } catch (error) {
        console.error('Error initializing interview:', error);
        toast.error('Failed to start interview');
      }
    };

    initializeInterview();

    return () => {
      AudioService.cleanup();
    };
  }, [user, cvData]);

  const updateProgress = () => {
    if (currentQuestion >= 4) {
      if (currentRole < cvData!.experience.length - 1) {
        setCurrentRole(prev => prev + 1);
        setCurrentQuestion(0);
        saveProgress();
      } else {
        completeInterview();
      }
    } else {
      setCurrentQuestion(prev => prev + 1);
      saveProgress();
    }
  };

  const saveProgress = () => {
    if (!user?.uid) return;
    
    localStorage.setItem('interview-progress', JSON.stringify({
      userId: user.uid,
      currentRole,
      currentQuestion,
      timestamp: Date.now()
    }));
  };

  const loadProgress = () => {
    if (!user?.uid) return;
    
    const saved = localStorage.getItem('interview-progress');
    if (saved) {
      const progress = JSON.parse(saved);
      if (progress.userId === user.uid) {
        setCurrentRole(progress.currentRole);
        setCurrentQuestion(progress.currentQuestion);
        toast.success('Interview progress restored');
      }
    }
  };

  const handleStartRecording = async () => {
    try {
      setIsProcessing(true);
      const started = await AudioService.startRecording();
      if (!started) {
        throw new Error('Failed to start recording');
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
      setIsProcessing(false);
    }
  };

  const handleStopRecording = () => {
    try {
      AudioService.stopRecording();
      AudioService.createResponse();
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
      setIsProcessing(false);
    }
  };

  const togglePause = () => {
    if (isPaused) {
      resumeInterview();
    } else {
      pauseInterview();
    }
  };

  const pauseInterview = () => {
    setIsPaused(true);
    saveProgress();
    AudioService.cleanup();
    toast.success('Interview paused', {
      description: 'Your progress has been saved'
    });
  };

  const resumeInterview = async () => {
    try {
      const initialized = await AudioService.initialize();
      if (!initialized) {
        throw new Error('Failed to resume interview');
      }
      setIsPaused(false);
      toast.success('Interview resumed');
    } catch (error) {
      console.error('Error resuming interview:', error);
      toast.error('Failed to resume interview');
    }
  };

  const completeInterview = () => {
    toast.success('Interview completed!', {
      description: 'Your profile has been updated with new insights'
    });
    localStorage.removeItem('interview-progress');
  };

  if (!cvData) return null;

  const progress = ((currentRole * 5 + currentQuestion) / (cvData.experience.length * 5)) * 100;
  const currentExperience = cvData.experience[currentRole];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">
                {currentExperience?.role} at {currentExperience?.company}
              </h3>
              <p className="text-sm text-muted-foreground">
                Role {currentRole + 1} of {cvData.experience.length}
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={togglePause}
              className="h-8 w-8"
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {Math.round(progress)}% Complete
            </p>
          </div>

          <AudioRecorder 
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            isProcessing={isProcessing}
            disabled={isPaused}
          />
        </div>
      </CardContent>
    </Card>
  );
}