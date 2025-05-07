/**
 * Formatta un'ora in formato HH:MM
 * @param date Data da formattare
 * @returns Stringa orario formattata
 */
export const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  /**
   * Formatta una data in formato esteso
   * @param date Data da formattare
   * @returns Stringa data formattata
   */
  export const formatDate = (date: Date): string => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  /**
   * Formatta una data relativa (oggi, ieri, ecc.)
   * @param date Data da formattare
   * @returns Stringa data relativa
   */
  export const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (dateOnly.getTime() === today.getTime()) {
      return 'Oggi';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Ieri';
    } else {
      return formatDate(date);
    }
  };
  
  /**
   * Formatta la dimensione del file in byte, KB, MB
   * @param bytes Dimensione in byte
   * @returns Stringa formattata con unità
   */
  export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };