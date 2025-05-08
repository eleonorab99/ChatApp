/**
 * Utility per verificare e risolvere problemi con le telecamere
 */

// Controlla se ci sono telecamere disponibili e restituisce informazioni su di esse
export const checkCameras = async (): Promise<{
    available: boolean;
    devices: MediaDeviceInfo[];
    error?: string;
  }> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return {
          available: false,
          devices: [],
          error: "API mediaDevices non supportata dal browser"
        };
      }
  
      // Ottieni permesso di accesso alle telecamere
      // Nota: questo serve per ottenere le etichette dei dispositivi
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (e) {
        console.warn("Impossibile accedere alla telecamera:", e);
        // Continua comunque per enumerare i dispositivi
      }
  
      // Enumera tutti i dispositivi
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      // Filtra solo le telecamere
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      // Rilascia lo stream se l'abbiamo acquisito
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
  
      return {
        available: videoDevices.length > 0,
        devices: videoDevices
      };
    } catch (error) {
      console.error("Errore durante il controllo delle telecamere:", error);
      return {
        available: false,
        devices: [],
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      };
    }
  };
  
  // Testa una telecamera specifica o la telecamera predefinita
  export const testCamera = async (deviceId?: string): Promise<{
    success: boolean;
    stream?: MediaStream;
    error?: string;
  }> => {
    try {
      // Configura i vincoli per la telecamera
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false
      };
  
      // Richiedi accesso alla telecamera
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Verifica che ci siano tracce video
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        // Rilascia lo stream
        stream.getTracks().forEach(track => track.stop());
        
        return {
          success: false,
          error: "Nessuna traccia video acquisita"
        };
      }
      
      // Restituisci lo stream di test
      return {
        success: true,
        stream
      };
    } catch (error) {
      console.error("Errore durante il test della telecamera:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      };
    }
  };
  
  // Risolvi problemi comuni con le telecamere
  export const fixCameraIssues = async (): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      // 1. Verifica se le telecamere sono disponibili
      const camerasInfo = await checkCameras();
      if (!camerasInfo.available) {
        return {
          success: false,
          message: `Nessuna telecamera disponibile: ${camerasInfo.error || "verifica le connessioni hardware"}`
        };
      }
      
      // 2. Prova a rilasciare tutte le telecamere già in uso
      // Questo può aiutare se la telecamera è bloccata da un'altra applicazione
      const allStreams = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      allStreams.getTracks().forEach(track => {
        console.log(`Rilascio traccia ${track.kind} (${track.label})`);
        track.stop();
      });
      
      // 3. Attendi un momento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 4. Prova a riaccedere alla telecamera predefinita
      const testResult = await testCamera();
      if (!testResult.success) {
        return {
          success: false,
          message: `Impossibile accedere alla telecamera dopo il reset: ${testResult.error}`
        };
      }
      
      // 5. Rilascia lo stream di test
      if (testResult.stream) {
        testResult.stream.getTracks().forEach(track => track.stop());
      }
      
      return {
        success: true,
        message: `Telecamera ripristinata con successo (${camerasInfo.devices.length} telecamere disponibili)`
      };
    } catch (error) {
      console.error("Errore durante il fix delle telecamere:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Errore sconosciuto durante il fix"
      };
    }
  };
  
  // Ottieni info dettagliate sullo stato delle telecamere
  export const getCameraDebugInfo = async (): Promise<string> => {
    try {
      // Raccogli tutte le informazioni rilevanti
      const camerasInfo = await checkCameras();
      const browserInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        mediaDevicesSupported: !!navigator.mediaDevices
      };
      
      // Formatta l'output
      let output = "=== INFORMAZIONI DEBUG TELECAMERE ===\n\n";
      
      output += `Browser: ${browserInfo.userAgent}\n`;
      output += `Piattaforma: ${browserInfo.platform}\n`;
      output += `API mediaDevices supportata: ${browserInfo.mediaDevicesSupported ? 'Sì' : 'No'}\n\n`;
      
      output += "Telecamere rilevate:\n";
      if (camerasInfo.devices.length === 0) {
        output += "  Nessuna telecamera rilevata\n";
        if (camerasInfo.error) {
          output += `  Errore: ${camerasInfo.error}\n`;
        }
      } else {
        camerasInfo.devices.forEach((device, index) => {
          output += `  ${index + 1}. ID: ${device.deviceId.substring(0, 8)}...\n`;
          output += `     Label: ${device.label || "Etichetta non disponibile"}\n`;
          output += `     Gruppo: ${device.groupId.substring(0, 8)}...\n`;
        });
      }
      
      return output;
    } catch (error) {
      console.error("Errore durante la raccolta di info di debug:", error);
      return `Errore durante la raccolta di info di debug: ${error instanceof Error ? error.message : "Errore sconosciuto"}`;
    }
  };
  
  export default {
    checkCameras,
    testCamera,
    fixCameraIssues,
    getCameraDebugInfo
  };