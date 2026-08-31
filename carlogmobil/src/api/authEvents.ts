type Listener = () => void;

const listeners: Listener[] = [];

export const emitUnauthorized = () => {
  listeners.forEach((listener) => listener());
};

export const addUnauthorizedListener = (listener: Listener) => {
  listeners.push(listener);
  
  // Unsubscribe fonksiyonu döndür
  return {
    remove: () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  };
};
