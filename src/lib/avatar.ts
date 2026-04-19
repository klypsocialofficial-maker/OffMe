/**
 * Utilities for generating default avatars when a user hasn't uploaded one.
 */

/**
 * Generates a consistent hex color based on a string (e.g., username).
 */
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

/**
 * Returns a default avatar URL using ui-avatars.com service.
 * The background color is generated from the username to ensure consistency.
 */
export const getDefaultAvatar = (displayName: string, username: string): string => {
  const seed = username || displayName || 'user';
  const color = stringToColor(seed);
  const name = displayName || username || 'U';
  const encodedName = encodeURIComponent(name);
  
  // background=${color} gives a consistent color for each user
  // color=fff ensures white text
  // size=512 for high quality
  return `https://ui-avatars.com/api/?name=${encodedName}&background=${color}&color=fff&size=512&bold=true`;
};
