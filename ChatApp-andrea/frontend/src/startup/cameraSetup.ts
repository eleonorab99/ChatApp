/**
 * Questo script si esegue all'avvio dell'app per preparare e verificare le telecamere
 */

import { fixCameraIssues, checkCameras } from '../utils/debugCamera';

const initCameras = async (): Promise<void> => {
  console.log("Inizializzazione telecamere...");
  
  try {
    // 1. Verifica se le telecamere sono disponibili
    const camerasInfo = await checkCameras();
    console.log("Camera check risultato:", camerasInfo);
    
    // 2. Se ci sono telecamere disponibili, assicurati che siano utilizzabili
    if (camerasInfo.available) {
      console.log(`Trovate ${camerasInfo.devices.length} telecamere disponibili`);
      
      // Salva le informazioni in sessionStorage per debug
      sessionStorage.setItem('cameraInfo', JSON.stringify({
        available: camerasInfo.available,
        deviceCount: camerasInfo.devices.length,
        labels: camerasInfo.devices.map(d => d.label || 'No label')
      }));
      
      // 3. Precarica i permessi per la telecamera
      // Questo può aiutare con browser che richiedono interazione utente
      try {
        // Richiedi accesso con vincoli minimi
        const testStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 160, height: 120 }, 
          audio: false 
        });
        
        // Rilascia immediatamente lo stream
        testStream.getTracks().forEach(track => {
          console.log(`Rilascio traccia di test: ${track.kind} (${track.label})`);
          track.stop();
        });
        
        console.log("Permessi telecamera pre-concessi con successo");
      } catch (e) {
        console.warn("Permessi telecamera non concessi automaticamente:", e);
        console.log("Le chiamate richiederanno interazione utente per i permessi");
      }
    } else {
      console.warn("Nessuna telecamera disponibile:", camerasInfo.error);
    }
  } catch (e) {
    console.error("Errore durante l'inizializzazione delle telecamere:", e);
  }
};

// Esporta la funzione per poterla chiamare da App.tsx
export const setupCameras = async (): Promise<void> => {
  // Esegui l'inizializzazione
  await initCameras();
  
  // Registra un listener per il cambiamento di visibilità della pagina
  // Questo può aiutare a recuperare le telecamere quando la pagina torna in primo piano
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      console.log("Pagina tornata in primo piano, ripristino telecamere...");
      
      // Prova a risolvere eventuali problemi con le telecamere
      try {
        const fixResult = await fixCameraIssues();
        console.log("Risultato fix telecamere:", fixResult);
      } catch (e) {
        console.error("Errore durante il fix delle telecamere:", e);
      }
    }
  });
};

export default setupCameras;