import express from 'express';
import pool from '../db/database';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// GET /api/tasks (My tasks or assigned tasks)
router.get('/', protect, async (req: any, res) => {
    try {
        const userId = req.user.id;
        // Filters
        const { status, priority, filter } = req.query; // filter='assigned_to_me' or 'created_by_me'

        let query = `
            SELECT t.*, 
                   u1.nom as assigned_name, u1.email as assigned_email,
                   u2.nom as creator_name
            FROM tasks t
            LEFT JOIN users u1 ON t.assigned_to = u1.id
            LEFT JOIN users u2 ON t.created_by = u2.id
            WHERE 1=1
        `;
        
        const params: any[] = [];
        let paramId = 1;

        if (filter === 'assigned_to_me') {
            query += ` AND t.assigned_to = $${paramId}`;
            params.push(userId);
            paramId++;
        } else if (filter === 'created_by_me') {
            query += ` AND t.created_by = $${paramId}`;
            params.push(userId);
            paramId++;
        } else {
             // By default show both or filtered? 
             // showing tasks where user involved or all? 
             // let's show all for now if no filter spec (admin view) or restrict?
             // Assuming manager sees all, others see theirs.
             // Simplified:
             // query += ` AND (t.assigned_to = $${paramId} OR t.created_by = $${paramId})`;
             // params.push(userId);
             // paramId++;
        }

        if (status) {
            query += ` AND t.status = $${paramId}`;
            params.push(status);
            paramId++;
        }

        if (priority) {
            query += ` AND t.priority = $${paramId}`;
            params.push(priority);
            paramId++;
        }
        
        query += ` ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur chargement tâches' });
    }
});

// POST /api/tasks
router.post('/', protect, async (req: any, res) => {
    try {
        const { title, description, assigned_to, priority, due_date, entity_type, entity_id } = req.body;
        const created_by = req.user.id;

        const result = await pool.query(
            `INSERT INTO tasks (title, description, assigned_to, priority, due_date, entity_type, entity_id, created_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'todo') RETURNING *`,
            [title, description, assigned_to, priority || 'medium', due_date, entity_type, entity_id, created_by]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur création tâche' });
    }
});

// PUT /api/tasks/:id (Update status, reassign, etc.)
router.put('/:id', protect, async (req: any, res) => {
    try {
        const { status, assigned_to, priority, description, due_date, comment } = req.body;
        const id = req.params.id;
        
        // Handle closing
        if (status === 'done') {
             await pool.query(
                `UPDATE tasks SET status='done', completed_at=NOW(), updated_at=NOW() WHERE id=$1`,
                [id]
             );
        } else {
             // General update
             let updateQuery = 'UPDATE tasks SET updated_at=NOW()';
             const params = [id];
             let paramId = 2; // START at 2 because id is 1

             if(status) { updateQuery += `, status=$${paramId}`; params.push(status); paramId++; }
             if(assigned_to) { updateQuery += `, assigned_to=$${paramId}`; params.push(assigned_to); paramId++; }
             if(priority) { updateQuery += `, priority=$${paramId}`; params.push(priority); paramId++; }
             if(description) { updateQuery += `, description=$${paramId}`; params.push(description); paramId++; }
             if(due_date) { updateQuery += `, due_date=$${paramId}`; params.push(due_date); paramId++; }
             
             updateQuery += ` WHERE id=$1 RETURNING *`;
             
             await pool.query(updateQuery, params);
        }

        // Add comment as a system message? Or separate comments? 
        // Spec says: "Ajouter commentaire". We can store it in messages table context='task'
        if (comment) {
            await pool.query(
                `INSERT INTO messages (sender_id, context_type, context_id, content, channel)
                 VALUES ($1, 'task', $2, $3, 'internal')`,
                [req.user.id, id, comment]
            );
        }

        res.json({ message: 'Tâche mise à jour' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur modification tâche' });
    }
});

export default router;
