// Builds the CORTEX app icon: white SF Symbol `brain.fill` on a neon iOS-style
// squircle, on the macOS icon grid (824pt body inside a 1024 canvas).
// Usage: swift scripts/make-icon.swift <symbol.png> <out.png>
import AppKit

let args = CommandLine.arguments
let symbol = NSImage(contentsOfFile: args[1])!
let size: CGFloat = 1024, body: CGFloat = 824, inset = (size - body) / 2

let ctx = CGContext(data: nil, width: Int(size), height: Int(size), bitsPerComponent: 8,
                    bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!

// Superellipse (n = 5) approximates Apple's continuous-corner squircle.
func squircle(_ r: CGRect, n: CGFloat = 5) -> CGPath {
  let p = CGMutablePath(), a = r.width / 2, b = r.height / 2
  for i in 0...720 {
    let t = CGFloat(i) / 720 * 2 * .pi
    let c = cos(t), s = sin(t)
    let x = r.midX + a * (c < 0 ? -1 : 1) * pow(abs(c), 2 / n)
    let y = r.midY + b * (s < 0 ? -1 : 1) * pow(abs(s), 2 / n)
    i == 0 ? p.move(to: CGPoint(x: x, y: y)) : p.addLine(to: CGPoint(x: x, y: y))
  }
  p.closeSubpath()
  return p
}

let rect = CGRect(x: inset, y: inset, width: body, height: body)
let shape = squircle(rect)

// Soft drop shadow, as macOS icons have.
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 28, color: CGColor(gray: 0, alpha: 0.45))
ctx.addPath(shape); ctx.setFillColor(CGColor(gray: 0, alpha: 1)); ctx.fillPath()
ctx.restoreGState()

// Neon gradient fill.
ctx.saveGState()
ctx.addPath(shape); ctx.clip()
let colors = [CGColor(red: 0.98, green: 0.24, blue: 0.62, alpha: 1),
              CGColor(red: 0.50, green: 0.22, blue: 0.98, alpha: 1),
              CGColor(red: 0.16, green: 0.62, blue: 1.00, alpha: 1)] as CFArray
let grad = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!, colors: colors, locations: [0, 0.55, 1])!
ctx.drawLinearGradient(grad, start: CGPoint(x: rect.minX, y: rect.maxY), end: CGPoint(x: rect.maxX, y: rect.minY), options: [])
// Glass highlight on the top half.
let hi = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!,
                    colors: [CGColor(gray: 1, alpha: 0.28), CGColor(gray: 1, alpha: 0)] as CFArray, locations: [0, 1])!
ctx.drawLinearGradient(hi, start: CGPoint(x: 0, y: rect.maxY), end: CGPoint(x: 0, y: rect.midY), options: [])
ctx.restoreGState()

// Symbol, centered, with a white glow.
var sr = CGRect(origin: .zero, size: symbol.size)
let cg = symbol.cgImage(forProposedRect: &sr, context: nil, hints: nil)!
let target: CGFloat = body * 0.56
let scale = target / max(CGFloat(cg.width), CGFloat(cg.height))
let w = CGFloat(cg.width) * scale, h = CGFloat(cg.height) * scale
ctx.saveGState()
ctx.setShadow(offset: .zero, blur: 30, color: CGColor(gray: 1, alpha: 0.55))
ctx.draw(cg, in: CGRect(x: (size - w) / 2, y: (size - h) / 2, width: w, height: h))
ctx.restoreGState()

let out = NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using: .png, properties: [:])!
try! out.write(to: URL(fileURLWithPath: args[2]))
