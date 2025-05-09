'use server';

/**
 * @fileOverview Utility functions for interacting with the Shapes.inc API, including health checks.
 */

export async function checkShapesApiHealth(): Promise<{ healthy: boolean; error?: string }> {
  const apiKey = process.env.SHAPESINC_API_KEY;
  const shapeUsername = process.env.SHAPESINC_SHAPE_USERNAME;

  if (!apiKey || !shapeUsername) {
    return { healthy: false, error: 'Shapes API key or username is not configured in environment variables.' };
  }

  try {
    // Perform a lightweight request to the chat completions endpoint to check API health.
    // A very short timeout can be used here if needed, but fetch's default usually suffices for a basic check.
    const response = await fetch('https://api.shapes.inc/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // For a health check, user and channel ID might not be strictly necessary
        // but including placeholder ones can prevent issues if the API strictly expects them.
        'X-User-Id': 'api_health_check',
        'X-Channel-Id': 'api_health_check_channel',
      },
      body: JSON.stringify({
        model: `shapesinc/${shapeUsername}`,
        messages: [{ role: 'user', content: "ping" }], // Minimal valid payload
      }),
      // Consider AbortSignal.timeout for fetch if running in an environment that supports it (Node 17.3.0+)
      // signal: AbortSignal.timeout(5000) // Example: 5 second timeout
    });

    if (response.status === 401) {
        return { healthy: false, error: 'Shapes API authentication failed. Please check your API Key.' };
    }
    
    // Check if the model exists (rudimentary check based on common error for Shapes API)
    // This requires parsing JSON, so ensure it's done carefully.
    if (response.status === 404) {
        try {
            const errorData = await response.json();
            if (errorData?.error?.message?.toLowerCase().includes('model not found')) {
                 return { healthy: false, error: `Shapes API: Model 'shapesinc/${shapeUsername}' not found. Please check your Shape Username.` };
            }
        } catch (e) {
            // Ignore JSON parsing error if it's not a model not found error, fall through to generic error.
        }
    }


    if (response.ok) {
      // The API responded successfully. We might not need to parse the body for a simple health check.
      return { healthy: true };
    } else {
      const errorBody = await response.text();
      console.error(`Shapes API Health Check Error (${response.status}): ${errorBody}`);
      return { healthy: false, error: `API request failed with status ${response.status}.` };
    }
  } catch (error) {
    console.error('Network or other error during Shapes API health check:', error);
    if (error instanceof Error) {
      // Check for specific timeout error if AbortSignal was used.
      // if (error.name === 'TimeoutError') {
      //   return { healthy: false, error: 'API request timed out.' };
      // }
      return { healthy: false, error: `A network or system error occurred: ${error.message}` };
    }
    return { healthy: false, error: 'An unknown error occurred while checking API health.' };
  }
}
