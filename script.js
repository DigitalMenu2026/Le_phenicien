// Configuration Supabase
const SUPABASE_URL = 'https://xypdrppmwbpagkcgpgdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGRycHBtd2JwYWdrY2dwZ2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjM1MTAsImV4cCI6MjEwMDg5OTUxMH0.qU1DQf91dNJNAeuW1yxSS99S1pMqQuS-dyZeZU4MQWc';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

    const resDateInput = document.getElementById('resDate');
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
    async function updateOccupiedTables() {
        const selectedDate = resDateInput ? resDateInput.value : null;
        if (!selectedDate) return;

        try {
            // Récupération des tables réservées pour la date sélectionnée
            const { data, error } = await supabaseClient
                .from('reservations')
                .select('table_selected')
                .eq('res_date', selectedDate);

            if (error) {
                console.error('Erreur Supabase SELECT:', error);
                return;
            }

            // Normalisation de la liste des tables réservées
            const occupiedTables = data ? data.map(item => item.table_selected.trim()) : [];

            // Parcours de tous les boutons de table du plan
            tableButtons.forEach(btn => {
                const tableName = btn.getAttribute('data-table')?.trim();

                if (tableName && occupiedTables.includes(tableName)) {
                    // Application de la classe ROUGE et désactivation
                    btn.classList.add('occupied');
                    btn.disabled = true;

                    // Si la table sélectionnée par le client vient d'être prise, on vide l'input
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

    // Recharger la disponibilité dès que l'utilisateur change de date
    if (resDateInput) {
        resDateInput.addEventListener('change', () => {
            updateOccupiedTables();
        });
    }

    // 3. Sélection interactive de table
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

            // Afficher la modale
            const modal = document.getElementById('confirmationModal');
            if (modal) modal.classList.add('active');

            // Reinitialiser le formulaire
            bookingForm.reset();
            tableButtons.forEach(b => b.classList.remove('selected'));
            if (resDateInput) {
                resDateInput.value = new Date().toISOString().split('T')[0];
            }

            // Recharger la disponibilité des tables
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

// Gestion de la fermeture de la Modale
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

    // 5. Effet de survol arrière-plan
    const canvasBg = document.getElementById('canvasBg');
    const cards = document.querySelectorAll('.interactive-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            const bgImage = card.getAttribute('data-bg');
            if (canvasBg && bgImage) canvasBg.style.backgroundImage = `url('${bgImage}')`;
        });
    });
});