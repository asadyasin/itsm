// Plain <a href="..."> or window.open() browser navigation can NOT include our Authorization
// header (the JWT access token lives in JS memory, not a cookie) — so any authenticated file
// download must go through axios first and then be saved as a blob.
export async function downloadAuthenticated(requestPromise, filename) {
  const response = await requestPromise;
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
