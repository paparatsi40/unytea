/**
 * AI Transcription Service
 * 
 * Handles audio transcription using OpenAI Whisper API
 * and generates summaries using GPT-4
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface TranscriptionSegment {
  id: string;
  text: string;
  start: number; // timestamp in seconds
  end: number;
  speaker?: string; // Optional speaker identification
}

export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
  wordCount: number;
}

export interface AIProcessingResult {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  topics: string[];
}

/**
 * Transcribe audio/video file using Whisper API
 */
export async function transcribeAudio(
  audioFilePath: string,
  language?: string
): Promise<TranscriptionResult> {
  try {
    console.log(`🎙️ Transcribing audio file: ${audioFilePath}`);

    // Check file size (Whisper has 25MB limit)
    const stats = fs.statSync(audioFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    if (fileSizeInMB > 25) {
      throw new Error(`File too large (${fileSizeInMB.toFixed(2)}MB). Whisper API limit is 25MB.`);
    }

    // Transcribe with timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: process.env.WHISPER_MODEL || 'whisper-1',
      response_format: 'verbose_json', // Get detailed response with timestamps
      language: language || 'en',
      timestamp_granularities: ['segment'], // Get segment-level timestamps
    });

    console.log(`✅ Transcription completed`);

    // Process segments
    const segments: TranscriptionSegment[] = (transcription.segments || []).map((seg: any, index: number) => ({
      id: `seg-${index}`,
      text: seg.text.trim(),
      start: seg.start,
      end: seg.end,
      speaker: undefined, // Whisper doesn't provide speaker diarization
    }));

    const fullText = segments.map(s => s.text).join(' ');
    const wordCount = fullText.split(/\s+/).length;
    const duration = segments.length > 0 ? segments[segments.length - 1].end : 0;

    return {
      fullText,
      segments,
      language: transcription.language || language || 'en',
      duration,
      wordCount,
    };
  } catch (error) {
    console.error('❌ Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transcribe from URL (downloads file first)
 */
export async function transcribeFromUrl(audioUrl: string): Promise<TranscriptionResult> {
  try {
    // Download file to temp location
    const tempDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `audio-${Date.now()}.mp4`);

    console.log(`⬇️ Downloading audio from URL: ${audioUrl}`);
    
    const response = await fetch(audioUrl);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(tempFile, Buffer.from(buffer));

    // Transcribe
    const result = await transcribeAudio(tempFile);

    // Cleanup
    fs.unlinkSync(tempFile);

    return result;
  } catch (error) {
    console.error('❌ Error transcribing from URL:', error);
    throw new Error(`Failed to transcribe from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate AI summary and extract insights using GPT-4
 */
export async function processTranscription(
  transcriptionText: string,
  additionalContext?: string
): Promise<AIProcessingResult> {
  try {
    console.log(`🤖 Processing transcription with GPT-4...`);

    const prompt = `
You are an AI assistant that analyzes transcripts from educational mentoring sessions. 
Analyze the following transcript and provide:

1. A concise summary (2-3 paragraphs)
2. Key points discussed (bullet points, maximum 8)
3. Action items or tasks mentioned (if any)
4. Main topics covered

${additionalContext ? `Context: ${additionalContext}\n\n` : ''}

Transcript:
${transcriptionText}

Please format your response as JSON with the following structure:
{
  "summary": "...",
  "keyPoints": ["point 1", "point 2", ...],
  "actionItems": ["task 1", "task 2", ...],
  "topics": ["topic 1", "topic 2", ...]
}
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that analyzes educational content and extracts key insights. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(responseText);

    console.log(`✅ GPT-4 processing completed`);

    return {
      summary: result.summary || '',
      keyPoints: result.keyPoints || [],
      actionItems: result.actionItems || [],
      topics: result.topics || [],
    };
  } catch (error) {
    console.error('❌ Error processing transcription with GPT-4:', error);
    throw new Error(`Failed to process transcription: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract specific information from transcription
 */
export async function extractInformation(
  transcriptionText: string,
  query: string
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts specific information from transcripts.',
        },
        {
          role: 'user',
          content: `Transcript:\n${transcriptionText}\n\nQuestion: ${query}`,
        },
      ],
      temperature: 0.5,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('❌ Error extracting information:', error);
    throw new Error(`Failed to extract information: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search within transcription
 */
export function searchTranscription(
  segments: TranscriptionSegment[],
  query: string
): TranscriptionSegment[] {
  const lowerQuery = query.toLowerCase();
  
  return segments.filter(segment =>
    segment.text.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get transcript at specific timestamp
 */
export function getTranscriptAtTime(
  segments: TranscriptionSegment[],
  timestamp: number
): TranscriptionSegment | undefined {
  return segments.find(segment =>
    timestamp >= segment.start && timestamp <= segment.end
  );
}