import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { getCurrentUser } from '@/lib/auth'
import { pool } from '@/lib/db'
import { extractText } from 'unpdf'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { cvBase64, jobDescription, jobTitle, paid } = await req.json()

    // Check usage
    const used = Number(user.analyses_used || 0)
    const paidCount = Number(user.analyses_paid || 0)

    if (used >= 1 && !paid && paidCount === 0) {
      return NextResponse.json({ error: 'Payment required' }, { status: 402 })
    }

    // Extract text from PDF
    const pdfBuffer = new Uint8Array(Buffer.from(cvBase64, 'base64'))
    const { text: cvText } = await extractText(pdfBuffer, { mergePages: true })

    if (!cvText || cvText.trim().length < 50) {
      return NextResponse.json({
        error: 'Could not extract text from your PDF. Make sure it is not a scanned image.'
      }, { status: 400 })
    }

    const prompt = `You are an expert CV coach and ATS specialist for the Kenyan job market.

Analyze this CV against the job description. Return ONLY a valid JSON object, no markdown, no backticks, no extra text.

{
  "ats_score": <number 0-100>,
  "match_score": <number 0-100>,
  "readability_score": <number 0-100>,
  "missing_keywords": [<6-10 important keywords from job description missing in CV>],
  "found_keywords": [<5-8 keywords found in both CV and job description>],
  "rewritten_summary": "<rewrite the candidate's actual summary using their real experience, tailored to match the job description's language and requirements. Do not invent experience they don't have>",
  "weak_sections": "<specific feedback on 2-3 weak areas and exactly how to fix them>",
  "interview_tips": "<3-4 tailored interview tips based on the role and CV>"
}

CV:
${cvText}

Job Description:
${jobDescription}`

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const text = completion.choices[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    // Save to DB
    await pool.execute(
      `INSERT INTO analyses
       (user_id, job_title, ats_score, match_score, readability_score, result, paid)
       VALUES (:userId, :jobTitle, :atsScore, :matchScore, :readabilityScore, :result, :paid)`,
      {
        userId: user.id,
        jobTitle: jobTitle || 'Untitled role',
        atsScore: analysis.ats_score,
        matchScore: analysis.match_score,
        readabilityScore: analysis.readability_score || 0,
        result: JSON.stringify(analysis),
        paid: paid || false,
      },
    )
    await pool.execute(
      'UPDATE users SET analyses_used = analyses_used + 1 WHERE id = :userId',
      { userId: user.id },
    )

    return NextResponse.json({ result: analysis })

  } catch (err: any) {
    console.error('Analysis error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}