import React, { useState, useEffect, useId } from 'react';
import { 
  CheckSquare, Plus, Filter, Calendar, MessageSquare, 
  Clock, AlertTriangle, CheckCircle, User, MoreVertical, ArrowLeft
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { taskApi } from '../api/taskApi';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatWindow from '../components/messaging/ChatWindow';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import LoadErrorState from '../components/ui/LoadErrorState';
import ModalDialog from '../components/ui/ModalDialog';

const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  // true dès le montage + erreur explicite : la liste restait blanche pendant le
  // chargement comme après un échec (T-042)
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all'); // all, assigned_to_me, created_by_me
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal & Chat State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeChatTask, setActiveChatTask] = useState<any | null>(null);
  const priorityId = useId(); // label « Priorité » associé à son select (T-050)

  // Form State
  const [newTask, setNewTask] = useState({
      title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' 
  });

  useEffect(() => {
      fetchTasks();
  }, [filter, statusFilter]);

  const fetchTasks = async () => {
      setLoading(true);
      setLoadError(null);
      try {
          const res = await taskApi.getTasks({ filter: filter === 'all' ? '' : filter, status: statusFilter });
          setTasks(res.data);
      } catch (e) {
          console.error(e);
          const message = (e as Error)?.message || 'Erreur chargement tâches';
          setLoadError(message);
          toast.error(message);
      } finally {
          setLoading(false);
      }
  };

  const handleCreateTask = async () => {
      // Validation client : le titre est le seul champ indispensable (T-042)
      if (!newTask.title.trim()) {
          toast.error('Le titre de la tâche est requis');
          return;
      }
      try {
          await taskApi.createTask(newTask);
          toast.success("Tâche créée");
          setShowCreateModal(false);
          setNewTask({ title: '', description: '', priority: 'medium', due_date: '', assigned_to: '' });
          fetchTasks();
      } catch (e) {
          // Message serveur conservé (taskApi.createTask le propage désormais)
          toast.error((e as Error)?.message || "Erreur création");
      }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
      try {
          await taskApi.updateTask(id, { status: newStatus });
          toast.success("Statut mis à jour");
          fetchTasks();
      } catch (e) {
          toast.error("Erreur mise à jour");
      }
  };

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
          case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
          case 'medium': return 'text-teal-600 bg-teal-50 border-teal-200';
          default: return 'text-base-content/70 bg-base-200 border-base-300';
      }
  };

  return (
    // h-full : la page épouse la zone de contenu du layout (padding de <main> et réserve de la
    // BottomNav compris) au lieu de 100vh-64px, qui débordait et créait un double défilement (T-048)
    <div className="h-full flex gap-6 overflow-hidden">
        {/* Left: Task List — sous xl, masquée tant qu'une discussion est ouverte (volet plein écran) ;
            min-w-0 : sans lui, le volet de droite écrasait la liste à 2px (T-048) */}
        <div className={`flex-1 min-w-0 flex-col h-full bg-base-100 rounded-2xl shadow-sm border overflow-hidden ${activeChatTask ? 'hidden xl:flex' : 'flex'}`}>
            {/* Header */}
            <div className="p-4 border-b flex flex-wrap gap-2 justify-between items-center bg-base-200/50">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <CheckSquare className="text-primary"/> Tâches
                    </h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <select 
                        aria-label="Filtrer les tâches"
                        className="text-sm border rounded-lg px-2 py-1.5 bg-base-100"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">Toutes les tâches</option>
                        <option value="assigned_to_me">Assignées à moi</option>
                        <option value="created_by_me">Créées par moi</option>
                    </select>
                    <Button onClick={() => setShowCreateModal(true)} size="sm" className="gap-2">
                        <Plus size={16}/> Nouvelle
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    [1, 2, 3, 4].map(i => <SkeletonLoader key={i} variant="rectangular" height={88} />)
                ) : loadError ? (
                    <LoadErrorState message={loadError} onRetry={fetchTasks} />
                ) : tasks.length === 0 ? (
                    <p className="text-center text-base-content/50 py-12">Aucune tâche</p>
                ) : tasks.map(task => (
                    // Plus de role="button" sur la carte (le bouton de statut y était imbriqué) : le titre est un
                    // vrai <button> dont la zone ::after couvre la carte (relative) ; le statut reste au-dessus (z-10).
                    // Le clic souris passe toujours par la carte (T-050, remplace le motif de T-049)
                    <div 
                        key={task.id} 
                        className={`relative group p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer bg-base-100 ${activeChatTask?.id === task.id ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        onClick={() => setActiveChatTask(task)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-start gap-3">
                                {/* shrink-0 : le bouton était écrasé à 7-13px par un titre long ; zone de clic agrandie par
                                    ::before (44px sous md, 36px au-delà, bordure comprise), pastille visuelle w-5 h-5 inchangée (T-050) */}
                                <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task.status === 'done' ? 'todo' : 'done'); }}
                                    aria-label={task.status === 'done' ? 'Marquer comme à faire' : 'Marquer comme faite'}
                                    title={task.status === 'done' ? 'Marquer comme à faire' : 'Marquer comme faite'}
                                    className={`relative z-10 shrink-0 before:absolute before:-inset-3.5 md:before:-inset-2.5 before:content-[''] mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-base-300 hover:border-primary'}`}
                                >
                                    {task.status === 'done' && <CheckCircle size={12}/>}
                                </button>
                                <div>
                                    <h3 className={`font-semibold ${task.status === 'done' ? 'line-through text-base-content/50' : 'text-base-content'}`}>
                                        {/* Bouton sans style propre (typo héritée, block pour garder le barré) ; anneau de focus sur toute la carte via ::after */}
                                        <button
                                            type="button"
                                            className="block w-full text-left cursor-pointer focus-visible:outline-none after:absolute after:-inset-px after:rounded-xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-primary"
                                        >
                                            {task.title}
                                        </button>
                                    </h3>
                                    <p className="text-sm text-base-content/60 line-clamp-1">{task.description}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pl-8 text-xs text-base-content/50">
                             <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <User size={12}/> {task.assigned_name || 'Non assigné'}
                                </span>
                                {task.due_date && (
                                    <span className={`flex items-center gap-1 ${new Date(task.due_date) < new Date() && task.status !== 'done' ? 'text-red-500 font-bold' : ''}`}>
                                        <Calendar size={12}/> {format(new Date(task.due_date), 'dd MMM')}
                                    </span>
                                )}
                             </div>
                             {/* Visible aussi au focus clavier d'un bouton de la carte et par défaut sans survol (tactile) (T-049) */}
                             <div className="flex items-center gap-1 text-primary group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 [@media(hover:none)]:opacity-100 opacity-0 transition-opacity">
                                 <MessageSquare size={12}/> Ouvrir chat
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right: Details / Chat */}
        {/* Sous xl : masqué sans tâche sélectionnée, plein écran (dans la page) avec « Retour » sinon.
            À partir de xl : colonne fixe de 500px, comme avant (T-048) */}
        <div className={`${activeChatTask ? 'flex' : 'hidden xl:flex'} flex-col flex-1 min-w-0 xl:flex-none xl:w-[500px] xl:shrink-0 h-full`}>
            {activeChatTask && (
                <button
                    type="button"
                    onClick={() => setActiveChatTask(null)}
                    className="xl:hidden self-start mb-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-base-content/70 hover:text-base-content hover:bg-base-200 transition focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                >
                    <ArrowLeft size={16}/> Retour
                </button>
            )}
            <div className="flex-1 min-h-0">
            {activeChatTask ? (
                <ChatWindow 
                    contextType="task" 
                    contextId={activeChatTask.id} 
                    title={activeChatTask.title} 
                    onClose={() => setActiveChatTask(null)}
                />
            ) : (
                <div className="h-full bg-base-200 rounded-2xl border border-dashed border-base-300 flex flex-col items-center justify-center text-base-content/50 p-8 text-center">
                    <MessageSquare size={48} className="mb-4 opacity-50"/>
                    <p className="font-medium">Sélectionnez une tâche pour voir les détails et discuter avec l'équipe.</p>
                </div>
            )}
            </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
            <ModalDialog onClose={() => setShowCreateModal(false)} labelledBy="task-create-title" className="max-w-lg">
                <Card className="w-full p-6">
                    <h3 id="task-create-title" className="text-lg font-bold mb-4">Nouvelle Tâche</h3>
                    <div className="space-y-4">
                        <Input label="Titre" required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="Ex: Relancer locataire X..." />
                        <Input label="Description" value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} placeholder="Détails de l'action..." />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={priorityId} className="block text-sm font-bold mb-1">Priorité</label>
                                <select id={priorityId} className="w-full border rounded-lg p-2" value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                                    <option value="low">Basse</option>
                                    <option value="medium">Moyenne</option>
                                    <option value="high">Haute</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                            <Input type="date" label="Échéance" value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
                        </div>
                        {/* Assign to field would go here with a user selector */}
                        
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Annuler</Button>
                            <Button onClick={handleCreateTask}>Créer</Button>
                        </div>
                    </div>
                </Card>
            </ModalDialog>
        )}
    </div>
  );
};

export default TasksPage;
