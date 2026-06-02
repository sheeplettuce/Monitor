import express from "express";
import cors from "cors";
const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (_, res) => {
    res.json({
        nombre: "Monitor API",
        estado: "OK"
    });
});
app.listen(3000, () => {
    console.log("Servidor iniciado en puerto 3000");
});
//# sourceMappingURL=server.js.map