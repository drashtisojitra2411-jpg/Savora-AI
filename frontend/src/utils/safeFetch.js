export const SERVER_ISSUE_MESSAGE = 'Server issue. Please try again.';

export async function safeFetch(url, options) {
  try {
    console.log('API CALL TRIGGERED', {
      url,
      method: options?.method || 'GET',
    });

    const response = await fetch(url, options);
    const text = await response.text();

    if (!text) {
      throw new Error('Empty response from server');
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON from server');
    }

    if (!response.ok || data?.success === false) {
      throw new Error(data?.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('FETCH ERROR:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
}
