import { useEffect, useState } from 'react'

export function AppLoader({ onComplete }: { onComplete: () => void }) {
  const [text, setText] = useState('')
  const [fadeOut, setFadeOut] = useState(false)
  const fullText = 'AI 写作助手'
  const typingSpeed = 150 // 每个字符的间隔时间（毫秒）

  useEffect(() => {
    let index = 0
    let timeoutId: NodeJS.Timeout

    const typeNextChar = () => {
      if (index < fullText.length) {
        setText(fullText.slice(0, index + 1))
        index++
        timeoutId = setTimeout(typeNextChar, typingSpeed)
      }
    }

    // 立即开始打字
    typeNextChar()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [])

  useEffect(() => {
    // 应用加载完成，开始淡出
    setFadeOut(true)
    const timer = setTimeout(() => {
      onComplete()
    }, 500) // 等待淡出动画完成

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div
      className={`fixed top-0 left-0 w-full h-full flex flex-col items-center justify-center z-[9999] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: '#FAF8F5' }}
    >
      <div className="relative">
        <div
          className="flex items-center relative"
          style={{
            fontSize: '32px',
            color: '#2C2C2C',
            fontWeight: 300,
            letterSpacing: '8px',
          }}
        >
          <div className="whitespace-nowrap inline-block">{text}</div>
          <span className="typing-cursor"></span>
          <div className="loader-progress"></div>
        </div>
      </div>

      <style>{`
        .typing-cursor {
          display: inline-block;
          width: 3px;
          height: 36px;
          background: #2C2C2C;
          margin-left: 4px;
          animation: blink 0.8s step-end infinite;
          vertical-align: middle;
        }

        @keyframes blink {
          50% {
            opacity: 0;
          }
        }

        .loader-progress {
          position: absolute;
          bottom: -20px;
          left: 0;
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #2C2C2C, transparent);
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
          0% {
            width: 0;
            left: 0;
          }
          50% {
            width: 100%;
            left: 0;
          }
          100% {
            width: 0;
            left: 100%;
          }
        }
      `}</style>
    </div>
  )
}

