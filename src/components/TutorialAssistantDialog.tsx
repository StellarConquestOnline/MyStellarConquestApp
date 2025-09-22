
'use client';

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getGameExplanation, type GetGameExplanationInput, type GetGameExplanationOutput } from '@/ai/flows/tutorial-assistant';
import { Loader2, Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const FormSchema = z.object({
  topic: z.string().min(3, { message: 'Topic must be at least 3 characters long.' }),
  playerContext: z.string().optional(),
});

type TutorialFormValues = z.infer<typeof FormSchema>;

interface TutorialAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TutorialAssistantDialog: React.FC<TutorialAssistantDialogProps> = ({ open, onOpenChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<GetGameExplanationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<TutorialFormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      topic: '',
      playerContext: '',
    },
  });

  const onSubmit: SubmitHandler<TutorialFormValues> = async (data) => {
    setIsLoading(true);
    setAiResponse(null);
    setError(null);
    try {
      const response = await getGameExplanation(data as GetGameExplanationInput);
      setAiResponse(response);
    } catch (err) {
      console.error('Error getting explanation:', err);
      setError('Failed to get explanation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground border-border shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="text-accent" /> Tutorial Assistant
          </DialogTitle>
          <DialogDescription>
            Ask about game mechanics, strategies, or anything else you need help with.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What do you want to know about?</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 'How does combat work?', 'Best starting strategy'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="playerContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optional: Add any context about your current situation</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 'I have 3 colonies and I'm being attacked by Player 2.'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting Advice...
                </>
              ) : (
                'Ask AI Assistant'
              )}
            </Button>
          </form>
        </Form>

        {error && <p className="text-destructive text-sm mt-4">{error}</p>}

        {aiResponse && (
          <ScrollArea className="mt-6 max-h-[300px] p-4 border border-border rounded-md bg-background/50">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-accent">Explanation:</h3>
                <p className="text-sm whitespace-pre-wrap">{aiResponse.explanation}</p>
              </div>
              {aiResponse.strategicTips && (
                <div>
                  <h3 className="font-semibold text-lg text-accent">Strategic Tips:</h3>
                  <p className="text-sm whitespace-pre-wrap">{aiResponse.strategicTips}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        <DialogFooter className="mt-4">
            <DialogClose asChild>
                <Button variant="outline">Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TutorialAssistantDialog;

    