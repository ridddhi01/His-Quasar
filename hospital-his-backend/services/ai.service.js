/**
 * AI Service - Lab Report Summarization
 * Uses Google Gemini for single-pass clinical summarization
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

/**
 * Extract text from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromPdf = async (filePath) => {
    try {
        // Dynamically require pdf-parse to avoid module issues
        const pdfParse = require('pdf-parse');

        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);

        if (!data.text || data.text.trim().length === 0) {
            throw new Error('PDF contains no extractable text');
        }

        return data.text.trim();
    } catch (error) {
        console.error('PDF extraction error:', error.message);
        throw error;
    }
};

/**
 * Generate clinical summary using Gemini
 * @param {string} reportText - Extracted text from lab report
 * @returns {Promise<string>} - AI-generated summary
 */
const generateLabSummary = async (reportText) => {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are a clinical lab report summarizer. Analyze this lab test report and provide a structured summary for a physician.

REPORT TEXT:
${reportText}

INSTRUCTIONS:
- Highlight abnormal values with ⚠️
- Include reference ranges if present
- Use clear medical terminology
- Be concise and scannable
- Format with markdown headings and bullet points

OUTPUT FORMAT:
## Key Findings
- [List abnormal values with their readings and reference ranges]

## Normal Results
- [Brief summary of normal parameters]

## Clinical Notes
- [Any special observations or recommendations from the report]

---
⚠️ **Disclaimer**: For clinical review only. This is not a diagnosis.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini API error:', error.message);
        throw new Error('Failed to generate AI summary');
    }
};

module.exports = {
    extractTextFromPdf,
    generateLabSummary
};
