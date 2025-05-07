import { Box, Typography } from "@mui/material";

const PaginaPrivacy = () => {
  return (
    <Box p={10}>
      <Typography variant="h5" gutterBottom>
        Informativa sulla Privacy
      </Typography>
      <Typography paragraph>
        La tua privacy è importante per noi. Questa informativa descrive come
        raccogliamo, utilizziamo e proteggiamo i tuoi dati personali quando
        utilizzi la nostra applicazione di messaggistica.
      </Typography>
      <Typography variant="h6" gutterBottom>
        Dati raccolti
      </Typography>
      <Typography paragraph>
        <ul>
          <li>
            <strong>Informazioni personali:</strong> Nome, indirizzo email e
            altre informazioni fornite durante la registrazione.
          </li>
          <li>
            <strong>Messaggi:</strong> I messaggi inviati e ricevuti sono
            crittografati e archiviati in modo sicuro.
          </li>
          <li>
            <strong>Informazioni tecniche:</strong> Indirizzo IP, tipo di
            dispositivo e dati di utilizzo per migliorare il servizio.
          </li>
        </ul>
      </Typography>
      <Typography variant="h6" gutterBottom>
        Come utilizziamo i tuoi dati
      </Typography>
      <Typography paragraph>
        <ul>
          <li>Per fornire e migliorare il servizio.</li>
          <li>Per garantire la sicurezza della piattaforma.</li>
          <li>Per comunicazioni relative al tuo account.</li>
        </ul>
      </Typography>
      <Typography variant="h6" gutterBottom>
        Protezione dei dati
      </Typography>
      <Typography paragraph>
        Adottiamo misure di sicurezza avanzate per proteggere i tuoi dati da
        accessi non autorizzati, perdita o divulgazione.
      </Typography>
      <Typography variant="h6" gutterBottom>
        Contattaci
      </Typography>
      <Typography paragraph>
        Per domande sulla privacy, puoi contattarci all'indirizzo{" "}
        <a href="mailto:privacy@chatapp.com">privacy@connectly.com</a>.
      </Typography>
    </Box>
  );
};

export default PaginaPrivacy;
