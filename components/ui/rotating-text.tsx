"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

/**
 * RotatingText - Auto-cycling text component
 *
 * Research-backed design decisions:
 * - Progressive disclosure: Shows one capability at a time
 * - Reduces cognitive load vs. reading a paragraph
 * - Creates visual interest without overwhelming
 * - 3-4 second intervals optimal for reading + processing
 *
 * Source: Nielsen Norman Group - Progressive Disclosure
 */

interface RotatingTextProps {
  texts: string[]
  interval?: number // ms between rotations
  className?: string
  prefix?: string
}

export function RotatingText({
  texts,
  interval = 3000,
  className = "",
  prefix = ""
}: RotatingTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length)
    }, interval)

    return () => clearInterval(timer)
  }, [texts.length, interval])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <span className="text-gray-400">{prefix}</span>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className="inline-block"
        >
          {texts[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

/**
 * TypewriterText - Character-by-character typing effect
 *
 * More engaging for hero sections, creates anticipation
 * Use for shorter, impactful statements
 */

interface TypewriterTextProps {
  texts: string[]
  typingSpeed?: number // ms per character
  deletingSpeed?: number // ms per character when deleting
  pauseDuration?: number // ms to pause after typing complete
  className?: string
}

export function TypewriterText({
  texts,
  typingSpeed = 50,
  deletingSpeed = 30,
  pauseDuration = 2000,
  className = ""
}: TypewriterTextProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [currentText, setCurrentText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const text = texts[currentTextIndex]

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < text.length) {
          setCurrentText(text.slice(0, currentText.length + 1))
        } else {
          // Finished typing, pause then delete
          setTimeout(() => setIsDeleting(true), pauseDuration)
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1))
        } else {
          // Finished deleting, move to next text
          setIsDeleting(false)
          setCurrentTextIndex((prev) => (prev + 1) % texts.length)
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed)

    return () => clearTimeout(timeout)
  }, [currentText, isDeleting, currentTextIndex, texts, typingSpeed, deletingSpeed, pauseDuration])

  return (
    <span className={className}>
      {currentText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-[2px] h-[1em] bg-accent ml-0.5 align-middle"
      />
    </span>
  )
}

/**
 * CapabilityScroller - Horizontal scrolling capabilities with icons
 *
 * Like Voyage AI's partner logo marquee, but for features
 * Creates trust through showing breadth of capabilities
 */

interface Capability {
  text: string
  icon?: React.ReactNode
}

interface CapabilityScrollerProps {
  capabilities: Capability[]
  speed?: number // pixels per second
  className?: string
}

export function CapabilityScroller({
  capabilities,
  speed = 30,
  className = ""
}: CapabilityScrollerProps) {
  // Duplicate for seamless loop
  const items = [...capabilities, ...capabilities]

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: items.length * (100 / speed),
            ease: "linear"
          }
        }}
      >
        {items.map((cap, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-gray-400 text-sm"
          >
            {cap.icon && <span className="text-accent">{cap.icon}</span>}
            <span>{cap.text}</span>
            <span className="text-gray-600 mx-4">•</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export default RotatingText
