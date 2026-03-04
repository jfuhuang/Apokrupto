import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'

const SketchCanvas = forwardRef(function SketchCanvas({ strokeColor = '#00D4FF', strokeWidth = 3, style, disabled }, ref) {
  const canvasRef = useRef(null)
  const [strokes, setStrokes] = useState([])
  const currentStroke = useRef(null)
  const isDrawing = useRef(false)

  useImperativeHandle(ref, () => ({
    getSketchData: () => ({ strokes }),
    setSketchData: (data) => {
      if (data?.strokes) {
        setStrokes(data.strokes)
        setTimeout(() => redrawAll(data.strokes), 0)
      }
    },
    clear: () => {
      setStrokes([])
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }))

  function redrawAll(strokesToDraw) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round';
    (strokesToDraw || strokes).forEach(stroke => {
      if (stroke.length < 2) return
      ctx.beginPath()
      ctx.moveTo(stroke[0][0], stroke[0][1])
      stroke.slice(1).forEach(([x, y]) => ctx.lineTo(x, y))
      ctx.stroke()
    })
  }

  useEffect(() => { redrawAll() }, [strokes, strokeColor, strokeWidth])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return [(e.touches[0].clientX - rect.left) * scaleX, (e.touches[0].clientY - rect.top) * scaleY]
    }
    return [(e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY]
  }

  function startDraw(e) {
    if (disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    isDrawing.current = true
    const [x, y] = getPos(e, canvas)
    currentStroke.current = [[x, y]]
  }

  function draw(e) {
    if (!isDrawing.current || disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const [x, y] = getPos(e, canvas)
    const stroke = currentStroke.current
    if (!stroke) return
    stroke.push([x, y])
    if (stroke.length >= 2) {
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = strokeWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(stroke[stroke.length - 2][0], stroke[stroke.length - 2][1])
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  function endDraw() {
    if (!isDrawing.current) return
    isDrawing.current = false
    if (currentStroke.current && currentStroke.current.length > 1) {
      setStrokes(prev => [...prev, currentStroke.current])
    }
    currentStroke.current = null
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        style={{
          width: '100%',
          height: '100%',
          cursor: disabled ? 'default' : 'crosshair',
          display: 'block',
          touchAction: 'none',
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
    </div>
  )
})

export default SketchCanvas
