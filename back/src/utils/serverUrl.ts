let _serverUrl = process.env.SERVER_URL || '';

export const setServerUrl = (url: string) => { _serverUrl = url; };
export const getServerUrl = () => _serverUrl;
