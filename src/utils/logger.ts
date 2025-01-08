export const logInfo = (message: string, ...args: any[]) => {
  console.info(`[INFO] ${message}`, ...args);
};

export const logError = (message: string, ...args: any[]) => {
  console.error(`[ERROR] ${message}`, ...args);
};

export const logSuccess = (message: string, ...args: any[]) => {
  console.log(`%c[SUCCESS] ${message}`, "color: green;", ...args);
};

export const logDebug = (message: string, ...args: any[]) => {
  console.debug(`[DEBUG] ${message}`, ...args);
};
