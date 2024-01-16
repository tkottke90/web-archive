
/**
 * Handle a Fetch Response
 * @param {Response} response 
 */
export async function parseResponse(response) {
  const data = await response.text();
  
  const output = { status: response.status, data, message: '' }

  try {
    output.data = JSON.parse(data);
  } catch (error) {
    // Ignore error, this would be a JSON parsing error
    output.status = 500;
    output.message = 'Unable to Parse JSON'
  }

  return output;
}