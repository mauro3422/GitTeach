(async () => {
    try {
        const { AIService } = await import('./js/services/aiService.js');
        const systemPrompt = "You are a repetition bot.";
        const userPrompt = "Write 5 short paragraphs about coding. End the last paragraph with 'END_OF_TEST_SUCCESSFUL'.";
        
        console.log('--- VERIFYING END OF RESPONSE ---');
        const response = await AIService.callAI(systemPrompt, userPrompt, 0.7);
        
        console.log('[Test Result] Full Response:', response);
        
        if (response.includes('END_OF_TEST_SUCCESSFUL')) { 
             console.log('[FIX CONFIRMED] Response completed fully.');
        } else {
             console.log('[STILL TRUNCATED] Response cut before end.');
        }
    } catch (e) {
        console.error('[FAIL]:', e);
    }
})();
