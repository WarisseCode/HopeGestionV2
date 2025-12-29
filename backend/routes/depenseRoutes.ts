import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: "Liste des dépenses (TODO)" });
});

export default router;
