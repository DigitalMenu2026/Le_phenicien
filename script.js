// Configuration Supabase
const SUPABASE_URL = 'https://xypdrppmwbpagkcgpgdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGRycHBtd2JwYWdrY2dwZ2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjM1MTAsImV4cCI6MjEwMDg5OTUxMH0.qU1DQf91dNJNAeuW1yxSS99S1pMqQuS-dyZeZU4MQWc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper : Convertit une heure "HH:MM" en minutes totales (ex: "17:00" -> 1020 min)
function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

document.addEventListener('DOMContentLoaded', () => {

    const resDateInput = document.getElementById('resDate');
    const resTimeInput = document.getElementById('resTime');
    const tableButtons = document.querySelectorAll('.t-square, .t-btn');
    const tableInput = document.getElementById('tableSelected');
    const bookingForm = document.getElementById('bookingForm');

    // 1. Initialisation de la date minimale (Aujourd'hui)
    if (resDateInput) {
        const today = new Date().toISOString().split('T')[0];
        resDateInput.min = today;
        if (!resDateInput.value) {
            resDateInput.value = today;
        }
    }

    // 2. Fonction pour charger et marquer les tables réservées en ROUGE
    // RÈGLE : Occupée à partir de (Heure de Réservation - 2 heures) jusqu'à la fin de la journée (23h59)
    async function updateOccupiedTables() {
        const selectedDate = resDateInput ? resDateInput.value : null;
        const selectedTime = resTimeInput ? resTimeInput.value : null;

        if (!selectedDate) return;

        try {
            // Récupération de toutes les réservations pour la date sélectionnée
            const { data, error } = await supabaseClient
                .from('reservations')
                .select('table_selected, res_time')
                .eq('res_date', selectedDate);

            if (error) {
                console.error('Erreur Supabase SELECT:', error);
                return;
            }

            const occupiedTables = [];

            if (data && data.length > 0) {
                const currentSelectedMinutes = selectedTime ? timeToMinutes(selectedTime) : null;

                data.forEach(item => {
                    const tableName = item.table_selected ? item.table_selected.trim() : '';
                    const reservationMinutes = timeToMinutes(item.res_time);

                    if (tableName && reservationMinutes !== null) {
                        // Si l'utilisateur n'a pas encore choisi d'heure d'arrivée,
                        // on masque par précaution toutes les tables déjà réservées dans la journée
                        if (currentSelectedMinutes === null) {
                            occupiedTables.push(tableName);
                        } else {
                            // Début du blocage : 2 heures avant la réservation (120 minutes)
                            const blockStartMinutes = reservationMinutes - 120;
                            // Fin du blocage : Fin de la journée (23h59 = 1439 minutes)
                            const blockEndMinutes = 1439;

                            // Vérification si le créneau choisi par le client tombe dans la plage d'occupation
                            if (currentSelectedMinutes >= blockStartMinutes && currentSelectedMinutes <= blockEndMinutes) {
                                occupiedTables.push(tableName);
                            }
                        }
                    }
                });
            }

            // Parcours de tous les boutons de table du plan
            tableButtons.forEach(btn => {
                const tableName = btn.getAttribute('data-table')?.trim();

                if (tableName && occupiedTables.includes(tableName)) {
                    // Application du style ROUGE et désactivation de la table
                    btn.classList.add('occupied');
                    btn.disabled = true;

                    // Si la table actuellement sélectionnée devient occupée, réinitialiser la sélection
                    if (tableInput && tableInput.value === tableName) {
                        tableInput.value = '';
                        btn.classList.remove('selected');
                    }
                } else {
                    btn.classList.remove('occupied');
                    btn.disabled = false;
                }
            });

        } catch (err) {
            console.error('Erreur lors du chargement des tables :', err);
        }
    }

    // Lancement immédiat au chargement de la page
    updateOccupiedTables();

    // Recharger la disponibilité au changement de DATE
    if (resDateInput) {
        resDateInput.addEventListener('change', () => {
            updateOccupiedTables();
        });
    }

    // Recharger la disponibilité au changement d'HEURE
    if (resTimeInput) {
        resTimeInput.addEventListener('change', () => {
            updateOccupiedTables();
        });
    }

    // 3. Sélection interactive de table sur le plan
    tableButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('occupied') || btn.disabled) return;

            tableButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            const tableName = btn.getAttribute('data-table');
            if (tableInput && tableName) {
                tableInput.value = tableName;
                document.getElementById('formSection')?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 4. Soumission du formulaire & Enregistrement dans Supabase
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!tableInput || !tableInput.value) {
                alert('⚠️ Veuillez sélectionner une table sur le plan ci-dessus avant de valider.');
                document.getElementById('plansContainer')?.scrollIntoView({ behavior: 'smooth' });
                return;
            }

            const submitBtn = bookingForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enregistrement en cours...';

            const formData = {
                table_selected: tableInput.value.trim(),
                full_name: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                res_date: document.getElementById('resDate').value,
                res_time: document.getElementById('resTime').value,
                guests: document.getElementById('guests').value,
                email: document.getElementById('email').value || null,
                notes: document.getElementById('notes').value || null
            };

            try {
                const { data, error } = await supabaseClient
                    .from('reservations')
                    .insert([formData]);

                if (error) throw error;

                // Remplissage des données dans la modale
                document.getElementById('mTable').textContent = formData.table_selected;
                document.getElementById('mName').textContent = formData.full_name;
                document.getElementById('mDate').textContent = formData.res_date;
                document.getElementById('mTime').textContent = formData.res_time;
                document.getElementById('mGuests').textContent = formData.guests + (formData.guests === '1' ? ' Personne' : ' Personnes');

                // Afficher la modale de confirmation
                const modal = document.getElementById('confirmationModal');
                if (modal) modal.classList.add('active');

                // Réinitialiser le formulaire
                bookingForm.reset();
                tableButtons.forEach(b => b.classList.remove('selected'));
                if (resDateInput) {
                    resDateInput.value = new Date().toISOString().split('T')[0];
                }

                // Mettre à jour immédiatement la disponibilité
                await updateOccupiedTables();

            } catch (err) {
                console.error('Erreur Supabase Insert :', err);
                alert('❌ Une erreur est survenue lors de l\'enregistrement. Veuillez réessayer.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    // 5. Gestion de la fermeture de la Modale
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalOverlay = document.getElementById('confirmationModal');

    if (closeModalBtn && modalOverlay) {
        closeModalBtn.addEventListener('click', () => {
            modalOverlay.classList.remove('active');
        });

        // Fermer en cliquant à l'extérieur de la carte
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        });
    }

    // 6. Effet de survol d'arrière-plan (optionnel)
    const canvasBg = document.getElementById('canvasBg');
    const cards = document.querySelectorAll('.interactive-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const bgImage = card.getAttribute('data-bg');
            if (canvasBg && bgImage) canvasBg.style.backgroundImage = `url('${bgImage}')`;
        });
    });
});