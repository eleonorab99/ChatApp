import { useTranslation } from "react-i18next";
import { Box, Typography } from "@mui/material";

const PaginaAssistenza = () => {
  const { t } = useTranslation();
  return (
    <Box p={10}>
      <Typography variant="h5" gutterBottom>
        {t("assistance.title", "Assistenza")}
      </Typography>
      <Typography paragraph>
        {t(
          "assistance.description",
          "Hai bisogno di aiuto? Siamo qui per supportarti! Consulta le informazioni qui sotto per trovare una soluzione ai tuoi problemi."
        )}
      </Typography>
      <Typography variant="h6" gutterBottom>
        {t("assistance.faqTitle", "Domande frequenti (FAQ)")}
      </Typography>
      <Typography component="ul" paragraph>
        <li>
          {t(
            "assistance.faq1",
            "Come posso recuperare la mia password? Vai alla pagina di login e clicca su 'Password dimenticata'. Segui le istruzioni per reimpostare la tua password."
          )}
        </li>
        <li>
          {t(
            "assistance.faq2",
            "Come segnalare un problema? Puoi segnalare un problema direttamente dall'app tramite la sezione 'Impostazioni' > 'Segnala un problema'."
          )}
        </li>
        <li>
          {t(
            "assistance.faq3",
            "Come posso eliminare il mio account? Contattaci all'indirizzo support@connectly.com per richiedere la cancellazione del tuo account."
          )}
        </li>
      </Typography>
      <Typography variant="h6" gutterBottom>
        {t("assistance.contactTitle", "Contattaci")}
      </Typography>
      <Typography paragraph>
        {t(
          "assistance.contactDescription",
          "Se non trovi la risposta che cerchi, puoi contattarci tramite:"
        )}
      </Typography>
      <Typography component="ul" paragraph>
        <li>{t("assistance.contactEmail", "Email: support@connectly.com")}</li>
        <li>{t("assistance.contactPhone", "Telefono: +321 123 4567")}</li>
      </Typography>
    </Box>
  );
};

export default PaginaAssistenza;
