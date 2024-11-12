import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2 } from 'lucide-react';

interface AudioRecorderProps {
  onStartRecording: () => Promise<void>;
  onStopRecording: () => void;
  isProcessing: boolean;
  disabled?: boolean;
}

export default function AudioRecorder({ 
  onStartRecording, 
  onStopRecording,
  isProcessing,
  disabled = false
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);

  const handleToggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      onStopRecording();
    } else {
      try {
        await onStartRecording();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  return (
    <Button
      size="lg"
      variant={isRecording ? "destructive" : "default"}
      onClick={handleToggleRecording}
      disabled={isProcessing || disabled}
      className="w-full"
    >
      {isRecording ? (
        <>
          <StopCircle className="mr-2 h-5 w-5" />
          Stop Recording
        </>
      ) : isProcessing ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Mic className="mr-2 h-5 w-5" />
          {disabled ? 'Interview Paused' : 'Click to Speak'}
        </>
      )}
    </Button>
  );
}