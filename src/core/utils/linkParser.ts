export const extractUrls = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

export const renderTextWithLinks = (text: string, isOwn?: boolean) => {
  return text;
};
