'use client';

import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function refineBio(currentBio: string): Promise<string> {
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    사용자가 작성한 다음의 자기소개 키워드나 문장을 바탕으로, 전문적이고 매력적인 비즈니스 프로필 소개글(Bio)로 다듬어줘.
    - 한국어로 작성할 것.
    - 문장은 정중하고 전문적인 톤을 유지할 것.
    - 너무 길지 않게 2~3문장 정도로 요약해줘.
    
    입력된 내용:
    "${currentBio}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    if (!response.text) {
      throw new Error('AI가 응답을 생성하지 못했습니다.');
    }

    return response.text.trim();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('AI 소개글 생성에 실패했습니다.');
  }
}
