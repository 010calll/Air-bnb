import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Le serveur MAISON écoute sur le port ${PORT}`);
});
