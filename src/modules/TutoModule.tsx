import React from 'react';
import { 
  BookOpen, 
  Package, 
  Wallet, 
  FileText, 
  ShieldCheck, 
  Smartphone,
  Info,
  ChefHat,
  UserPlus,
  MessageSquare,
  ArrowRightLeft,
  Coins
} from 'lucide-react';

const TutoSection = ({ title, icon: Icon, children }: any) => (
  <section className="mb-12">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-[#B45309]/10 text-[#B45309] rounded-sm">
        <Icon size={24} />
      </div>
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </div>
  </section>
);

const TutoCard = ({ title, description, steps }: any) => (
  <div className="bg-white p-6 rounded-sm border border-neutral-200 shadow-sm">
    <h3 className="font-bold mb-2 flex items-center gap-2">
      {title}
      <Info size={14} className="text-[#B45309]" />
    </h3>
    <p className="text-neutral-500 text-sm mb-4">{description}</p>
    <ul className="space-y-3">
      {steps.map((step: string, i: number) => (
        <li key={i} className="flex gap-3 text-sm">
          <span className="flex-shrink-0 w-5 h-5 bg-neutral-100 text-neutral-500 rounded-full flex items-center justify-center text-[10px] font-bold">
            {i + 1}
          </span>
          <span className="text-neutral-700">{step}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const TutoModule = () => {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Centre d'Aide & Tutoriels</h1>
        <p className="text-neutral-500">Apprenez à maîtriser Orchidée Nature Management System</p>
      </header>

      <TutoSection title="Authentification & Accès" icon={UserPlus}>
        <TutoCard 
          title="Demander un compte" 
          description="Comment rejoindre l'équipe."
          steps={[
            "Sur la page de login, cliquez sur 'Demander un compte'.",
            "Remplissez votre nom, email et le rôle souhaité.",
            "Le Super Administrateur recevra une notification pour valider.",
            "Une fois validé, vous pourrez vous connecter."
          ]}
        />
        <TutoCard 
          title="Mot de passe oublié" 
          description="Récupérer l'accès à votre compte."
          steps={[
            "Cliquez sur 'Oublié ?' à côté du champ mot de passe.",
            "Saisissez votre email et le nouveau mot de passe souhaité.",
            "La demande est envoyée au Super Administrateur.",
            "Il confirmera le changement manuellement."
          ]}
        />
        <TutoCard 
          title="Rester connecté" 
          description="Gérer la durée de votre session."
          steps={[
            "Cochez la case 'Rester connecté (48h)' lors de la connexion.",
            "Votre session restera active même si vous fermez le navigateur.",
            "Pour des raisons de sécurité, déconnectez-vous manuellement sur les appareils partagés.",
            "La déconnexion manuelle annule immédiatement cette option."
          ]}
        />
      </TutoSection>

      <TutoSection title="Production & Cuisine" icon={ChefHat}>
        <TutoCard 
          title="Gérer les Recettes (BOM)" 
          description="Lier produits finis et matières premières."
          steps={[
            "Allez dans 'Production' > 'Recettes'.",
            "Créez une recette pour chaque produit fini.",
            "Ajoutez les ingrédients et leurs quantités précises.",
            "La production déduira automatiquement ces stocks."
          ]}
        />
        <TutoCard 
          title="Approvisionnement & Livraisons" 
          description="Flux entre cuisine et agences."
          steps={[
            "Utilisez 'Approvisionnement' pour demander des matières premières.",
            "Utilisez 'Livraisons' pour envoyer des produits finis aux agences.",
            "Les administrateurs reçoivent des notifications instantanées."
          ]}
        />
      </TutoSection>

      <TutoSection title="Agences & Points de Vente" icon={ArrowRightLeft}>
        <TutoCard 
          title="Ventes & Calculatrice" 
          description="Enregistrement intelligent des ventes."
          steps={[
            "Ajoutez des produits au panier.",
            "Modifiez le prix unitaire si nécessaire (une alerte est envoyée à l'admin).",
            "Choisissez 'Payé' ou 'À Crédit' (Client obligatoire pour le crédit).",
            "Partagez le reçu via WhatsApp ou QR Code."
          ]}
        />
        <TutoCard 
          title="Réceptions & Retours" 
          description="Suivi des flux physiques."
          steps={[
            "Allez dans 'Stocks Agence'.",
            "Enregistrez les réceptions de produits venant de la cuisine.",
            "Déclarez les retours de produits défectueux ou invendus.",
            "Le stock local est mis à jour instantanément."
          ]}
        />
      </TutoSection>

      <TutoSection title="Trésorerie & Finance" icon={Coins}>
        <TutoCard 
          title="Encaissements Transversaux" 
          description="Collecte des fonds et activités externes."
          steps={[
            "Enregistrez les collectes d'argent auprès des agences.",
            "Saisissez les revenus d'activités extérieures ou évènements.",
            "Générez une preuve de paiement infalsifiable avec QR Code.",
            "Partagez le reçu numérique au payeur pour preuve."
          ]}
        />
        <TutoCard 
          title="Traçabilité & Preuve" 
          description="Sécurité des flux financiers."
          steps={[
            "Chaque transaction génère un Hash unique (ID de transaction).",
            "Le QR Code permet de vérifier l'authenticité de l'opération.",
            "Toutes les opérations sont liées au compte Admin pour audit."
          ]}
        />
      </TutoSection>

      <TutoSection title="Communication Interne" icon={MessageSquare}>
        <TutoCard 
          title="Chat d'équipe" 
          description="Partage d'informations en temps réel."
          steps={[
            "Accédez au 'Chat Interne' depuis le menu.",
            "Envoyez des messages visibles par tous les membres de l'équipe.",
            "Partagez les alertes, consignes ou infos urgentes.",
            "Les messages sont synchronisés instantanément."
          ]}
        />
      </TutoSection>

      <TutoSection title="Gestion des Stocks" icon={Package}>
        <TutoCard 
          title="Ajouter un produit" 
          description="Comment intégrer un nouvel article au catalogue."
          steps={[
            "Allez dans l'onglet 'Produits'.",
            "Cliquez sur 'Ajouter un produit'.",
            "Saisissez le nom, les prix d'achat et de vente.",
            "Validez pour synchroniser avec le serveur."
          ]}
        />
        <TutoCard 
          title="Alertes de stock" 
          description="Comprendre les indicateurs visuels."
          steps={[
            "Vert : Stock suffisant.",
            "Orange : Seuil critique atteint, réapprovisionnement conseillé.",
            "Rouge : Rupture de stock, commande urgente nécessaire."
          ]}
        />
      </TutoSection>

      <TutoSection title="Caisse & Ventes" icon={Wallet}>
        <TutoCard 
          title="Ouvrir une session" 
          description="Procédure matinale obligatoire."
          steps={[
            "Accédez au module 'Caisse'.",
            "Saisissez votre fond de caisse initial.",
            "Confirmez avec votre PIN ou Empreinte.",
            "La session est maintenant active."
          ]}
        />
        <TutoCard 
          title="Rendu monnaie" 
          description="Éviter les erreurs de calcul."
          steps={[
            "Saisissez les articles de la vente.",
            "Entrez le montant reçu du client.",
            "Le montant à rendre s'affiche en gros caractères verts.",
            "Validez pour imprimer le ticket."
          ]}
        />
      </TutoSection>

      <TutoSection title="Sécurité" icon={ShieldCheck}>
        <TutoCard 
          title="PIN & Biométrie" 
          description="Sécuriser vos opérations sensibles."
          steps={[
            "Chaque utilisateur possède un PIN unique à 4 chiffres.",
            "Sur mobile, vous pouvez utiliser votre empreinte digitale.",
            "Les opérations de clôture de caisse exigent toujours une double validation."
          ]}
        />
      </TutoSection>

      <TutoSection title="Mode Hors-Ligne" icon={Smartphone}>
        <TutoCard 
          title="Travailler sans connexion" 
          description="Continuité de service garantie."
          steps={[
            "En cas de coupure internet, l'indicateur devient gris.",
            "Continuez vos ventes normalement.",
            "Les données sont stockées localement sur votre appareil.",
            "La synchronisation reprend automatiquement dès le retour du réseau."
          ]}
        />
      </TutoSection>
    </div>
  );
};
