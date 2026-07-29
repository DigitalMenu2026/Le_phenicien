// 1. IDENTIFIANTS ADMIN LOCAL
const ADMIN_USER = "admin";
const ADMIN_PASS = "phenicien2026";

// 2. CONFIGURATION SUPABASE
const SUPABASE_URL = 'https://xypdrppmwbpagkcgpgdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5cGRycHBtd2JwYWdrY2dwZ2RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzMjM1MTAsImV4cCI6MjEwMDg5OTUxMH0.qU1DQf91dNJNAeuW1yxSS99S1pMqQuS-dyZeZU4MQWc';

let supabaseClient = null;
let reservations = [];

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("SDK Supabase introuvable.");
    }

    if (sessionStorage.getItem("isAdminLoggedIn") === "true") {
        showDashboard();
    }
});

// Connexion Admin
function handleLogin(event) {
    event.preventDefault();
    const userInput = document.getElementById("username").value;
    const passInput = document.getElementById("password").value;
    const errorBox = document.getElementById("login-error");

    if (userInput === ADMIN_USER && passInput === ADMIN_PASS) {
        sessionStorage.setItem("isAdminLoggedIn", "true");
        errorBox.style.display = "none";
        showDashboard();
    } else {
        errorBox.style.display = "block";
    }
}

// Fonction pour écouter les nouvelles réservations en temps réel
function setupRealtimeSubscription() {
    supabaseClient
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // Écoute tous les changements (INSERT, DELETE, UPDATE)
                schema: 'public',
                table: 'reservations'
            },
            (payload) => {
                console.log('Changement détecté dans Supabase :', payload);
                // Recharge automatiquement les réservations
                fetchReservations();
            }
        )
        .subscribe();
}

// Appeler la fonction lors de l'affichage du Dashboard
function showDashboard() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("admin-dashboard").style.display = "block";
    
    fetchReservations();
    setupRealtimeSubscription(); // <--- AJOUTER CETTE LIGNE
}

// Déconnexion
function logout() {
    sessionStorage.removeItem("isAdminLoggedIn");
    document.getElementById("admin-dashboard").style.display = "none";
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("login-form").reset();
}

/* ==========================================================================
   RÉCUPÉRATION ET GESTION SUPABASE
   ========================================================================== */

async function fetchReservations() {
    const tbody = document.getElementById("reservations-body");
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">Chargement des données...</td></tr>`;

    if (!supabaseClient) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ff4d4d; padding:20px;">Erreur : Supabase non initialisé.</td></tr>`;
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from('reservations')
            .select('*')
            .order('res_date', { ascending: false });

        if (error) throw error;

        reservations = data || [];
        updateStats();
        renderReservations(reservations);

    } catch (err) {
        console.error("Erreur de récupération Supabase:", err.message);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ff4d4d; padding:20px;">Erreur lors du chargement des réservations.</td></tr>`;
    }
}

function updateStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = reservations.filter(r => r.res_date === todayStr).length;

    if (document.getElementById("total-today")) document.getElementById("total-today").textContent = todayCount;
    if (document.getElementById("tables-occupied")) document.getElementById("tables-occupied").textContent = `${todayCount} table(s)`;
    if (document.getElementById("total-all")) document.getElementById("total-all").textContent = reservations.length;
}

function renderReservations(data) {
    const tbody = document.getElementById("reservations-body");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#8c96a8;">Aucune réservation trouvée.</td></tr>`;
        return;
    }

    data.forEach(res => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${res.full_name || 'Anonyme'}</strong>
                ${res.email ? `<br><small style="color:#8c96a8;">${res.email}</small>` : ''}
            </td>
            <td>${res.phone || 'N/A'}</td>
            <td><strong>${res.res_date || ''}</strong> à <strong>${res.res_time || ''}</strong></td>
            <td><span style="color:var(--gold-bright); font-weight:600;">${res.table_selected || 'N/A'}</span></td>
            <td><i class="fas fa-users"></i> ${res.guests || 1} pers.</td>
            <td><small style="color:#c4cbd4;">${res.notes || '-'}</small></td>
            <td>
                <button class="btn-action delete" title="Supprimer la réservation" onclick="deleteReservation(${res.id})">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteReservation(id) {
    if (confirm("⚠️ Voulez-vous vraiment supprimer cette réservation ?")) {
        try {
            const { error } = await supabaseClient
                .from('reservations')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchReservations();
        } catch (err) {
            alert("Erreur lors de la suppression : " + err.message);
        }
    }
}

function filterTable() {
    const searchValue = document.getElementById("search-input").value.toLowerCase().trim();

    const filtered = reservations.filter(res => {
        const fullName = (res.full_name || '').toLowerCase();
        return fullName.includes(searchValue);
    });

    renderReservations(filtered);
}

// Fonction pour écouter les nouvelles réservations en temps réel
function setupRealtimeSubscription() {
    supabaseClient
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: '*', // Écoute tous les changements (INSERT, DELETE, UPDATE)
                schema: 'public',
                table: 'reservations'
            },
            (payload) => {
                console.log('Changement détecté dans Supabase :', payload);
                // Recharge automatiquement les réservations
                fetchReservations();
            }
        )
        .subscribe();
}
