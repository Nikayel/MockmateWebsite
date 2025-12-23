/**
 * Text Chunking Strategies
 * 
 * Provides different strategies for splitting text into chunks
 * for embedding and retrieval
 */

import type { Chunk, ChunkOptions } from '../types'

/**
 * Default chunker that splits by sentences
 */
export class SentenceChunker {
  chunk(text: string, options: ChunkOptions = {}): Chunk[] {
    const {
      maxChunkSize = 500,
      overlap = 50,
      strategy = 'sentence'
    } = options

    if (strategy === 'sentence') {
      return this.chunkBySentence(text, maxChunkSize, overlap)
    } else if (strategy === 'paragraph') {
      return this.chunkByParagraph(text, maxChunkSize, overlap)
    } else {
      return this.chunkByToken(text, maxChunkSize, overlap)
    }
  }

  private chunkBySentence(text: string, maxSize: number, overlap: number): Chunk[] {
    const sentences = text.split(/[.!?]+\s+/)
    const chunks: Chunk[] = []
    let currentChunk = ''
    let startIndex = 0

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence

      if (potentialChunk.length <= maxSize) {
        currentChunk = potentialChunk
      } else {
        if (currentChunk) {
          chunks.push({
            text: currentChunk,
            startIndex,
            endIndex: startIndex + currentChunk.length,
          })
          // Start next chunk with overlap
          const overlapText = currentChunk.slice(-overlap)
          startIndex += currentChunk.length - overlap
          currentChunk = `${overlapText} ${sentence}`
        } else {
          // Single sentence is too long, split it
          const words = sentence.split(' ')
          let wordChunk = ''
          for (const word of words) {
            if ((wordChunk + ' ' + word).length <= maxSize) {
              wordChunk = wordChunk ? `${wordChunk} ${word}` : word
            } else {
              if (wordChunk) {
                chunks.push({
                  text: wordChunk,
                  startIndex,
                  endIndex: startIndex + wordChunk.length,
                })
                startIndex += wordChunk.length
              }
              wordChunk = word
            }
          }
          currentChunk = wordChunk
        }
      }
    }

    if (currentChunk) {
      chunks.push({
        text: currentChunk,
        startIndex,
        endIndex: startIndex + currentChunk.length,
      })
    }

    return chunks
  }

  private chunkByParagraph(text: string, maxSize: number, overlap: number): Chunk[] {
    const paragraphs = text.split(/\n\s*\n/)
    const chunks: Chunk[] = []
    let startIndex = 0

    for (const paragraph of paragraphs) {
      if (paragraph.length <= maxSize) {
        chunks.push({
          text: paragraph,
          startIndex,
          endIndex: startIndex + paragraph.length,
        })
        startIndex += paragraph.length
      } else {
        // Paragraph too long, use sentence chunking
        const sentenceChunks = this.chunkBySentence(paragraph, maxSize, overlap)
        for (const chunk of sentenceChunks) {
          chunks.push({
            ...chunk,
            startIndex: startIndex + chunk.startIndex,
            endIndex: startIndex + chunk.endIndex,
          })
        }
        startIndex += paragraph.length
      }
    }

    return chunks
  }

  private chunkByToken(text: string, maxSize: number, overlap: number): Chunk[] {
    const words = text.split(/\s+/)
    const chunks: Chunk[] = []
    let currentChunk: string[] = []
    let startIndex = 0
    let charIndex = 0

    for (const word of words) {
      const potentialChunk = [...currentChunk, word].join(' ')
      
      if (potentialChunk.length <= maxSize) {
        currentChunk.push(word)
      } else {
        if (currentChunk.length > 0) {
          const chunkText = currentChunk.join(' ')
          chunks.push({
            text: chunkText,
            startIndex,
            endIndex: startIndex + chunkText.length,
          })
          
          // Overlap: keep last N words
          const overlapWords = Math.floor((overlap / 10)) // Rough estimate
          currentChunk = currentChunk.slice(-overlapWords)
          startIndex = charIndex - currentChunk.join(' ').length
        }
        currentChunk = [word]
      }
      charIndex += word.length + 1 // +1 for space
    }

    if (currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ')
      chunks.push({
        text: chunkText,
        startIndex,
        endIndex: startIndex + chunkText.length,
      })
    }

    return chunks
  }
}

/**
 * Simple chunker for code/text that doesn't need sophisticated splitting
 */
export class SimpleChunker {
  chunk(text: string, options: ChunkOptions = {}): Chunk[] {
    const { maxChunkSize = 1000 } = options
    
    if (text.length <= maxChunkSize) {
      return [{
        text,
        startIndex: 0,
        endIndex: text.length,
      }]
    }

    const chunks: Chunk[] = []
    for (let i = 0; i < text.length; i += maxChunkSize) {
      chunks.push({
        text: text.slice(i, i + maxChunkSize),
        startIndex: i,
        endIndex: Math.min(i + maxChunkSize, text.length),
      })
    }

    return chunks
  }
}

