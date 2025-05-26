interface Conteneur {
	etat: string;
	id: string;
	titre: string;
	datePubli: number;
	origine: string;
	nature: string;
	cid: string;
	idTechInjection: string;
	url: string;
	ancienId: string | null;
	idEli: string;
	numero: string;
	refInjection: string;
	num: string;
	relevantDate: string | null;
}

export interface GetJorfContResponse {
	totalNbResult: number;
	executionTime: number;
	containers: Conteneur[];
}

export interface GetJosResponse {
	totalNbResult: number;
	executionTime: number;
	items: GetJorfContResponseItem[];
}

export interface GetJorfContResponseItem {
	joInap: JoEa;
	joCont: JoCont;
	joEA: JoEa;
	josPat: JoEa[];
}

export interface JoCont {
	structure: Structure;
	etat: string;
	id: string;
	titre: string;
	datePubli: string;
	origine: string;
	nature: string;
	idTechInjection: string;
	url: string;
	ancienId: string;
	idEli: string;
	numero: string;
	refInjection: string;
	num: string;
	relevantDate: Date;
}

export interface Structure {
	liens: Lien[];
	tms: Tm[];
}

export interface Lien {
	autorite: string;
	etat: string;
	id: string;
	titre: string;
	dateModif: Date;
	ministere: string;
	emetteur: string;
	nature: string;
	numSequence: number;
	ordre: number;
}

export interface Tm {
	liensTxt: Lien[];
	ordre: number;
	tms: Tm[];
	titre: string;
	niv: number;
}

export interface JoEa {
	pathToFile: string;
	fileName: string;
	displaySize: string;
	id: string;
	complementNumber: string;
	datePubli: string;
	origine: string;
	size: number;
	type: string;
	num: string;
}

export interface ConsultJorfResponse {
	/** Temps d'exécution */
	executionTime: number;
	/** Identifie si le contenu est référençable par les robots d'indexation */
	dereferenced: boolean;
	/** Identifiant du texte */
	id: string;
	/** Identifiant du conteneur du texte lorsqu'il en existe un. */
	idConteneur: null;
	/** Chronical ID du texte */
	cid: string;
	/** Titre du texte */
	title: string;
	/** Numéro NOR */
	nor: string;
	/** identifiant européen de la législation ou European Legislation Identifier */
	eli: string;
	/** Alias */
	alias: string;
	/** Titre du texte correspondant */
	jorfText: string;
	/** Etat juridique du texte */
	jurisState: string;
	/** Visas */
	visa: string;
	/** Date de modification */
	modifDate: null;
	/** Date d'état juridique */
	jurisDate: null;
	/** Date de début de la version */
	dateDebutVersion: Date;
	/** Date de fin de la version */
	dateFinVersion: Date;
	/** Signataires */
	signers: string;
	/** Travaux préparatoires */
	prepWork: string;
	/** Date de parution */
	dateParution: number;
	/** Date de signature */
	dateTexte: number;
	/** Numéro de parution */
	numParution: string;
	/** Notice */
	notice: string;
	/** Nota */
	nota: string;
	/** INAP */
	inap: boolean;
	/** Numéro de texte */
	textNumber: string;
	/** Indique si le texte est abrogé */
	textAbroge: boolean;
	/** Etat du texte */
	etat: null;
	/** Liste des dossiers legislatifs */
	dossiersLegislatifs: any[];
	/** Nature */
	nature: string;
	/** Résumé */
	resume: null;
	/** Rectificatif */
	rectificatif: null;
	/** Mots-clés */
	motsCles: any[];
	/** Appellations */
	appellations: any[];
	/** Liens */
	liens: any[];
	/** Observations */
	observations: null;
	/** Liste des sections de premier niveau du texte. La liste est ordonnée */
	sections: any[];
	/** Liste des articles racine du texte. La liste est ordonnée */
	articles: ConsultArticle[];
	/** Le numéro de la page de l'article dans le journal officiel */
	pagePdf: null;
	fileName: null;
	fileSize: null;
	filePath: null;
	/** Liste des métadonnées des fichiers attachés au document */
	jorfFileMetadata: JorfFileMetadatum[];
	/** Indique si le texte a une version consolidée */
	hasLoda: boolean;
	/** Indique si la requête a remonté un seul pdf */
	hasSinglePdf: boolean;
}

export interface ConsultArticle {
	/** Temps d'exécution */
	executionTime: number;
	/** Identifie si le contenu est référençable par les robots d'indexation */
	dereferenced: boolean;
	/** Identifiant */
	id: string;
	/** Chronical ID */
	cid: string;
	/** Numéro indiquant l'ordre d'affichage */
	intOrdre: number;
	/** Etat juridique */
	etat: string;
	/** Numéro de l'article */
	num: string;
	/** Chemin de l'article */
	path: string;
	/** Titre des sections du chemin de l'article */
	pathTitle: any[];
	/** Contenu HTML de l'article */
	content: string;
	/** Nota */
	nota: null;
	/** Indique si l'article contient des liens de citation. Utiliser l'API relatedLinksArticle pour récupérer la liste des liens. */
	comporteLiens: boolean;
	/** Indique si l'article contient des liens du service-publique. Utiliser l'API servicePublicLinksArticle pour récupérer la liste des liens. */
	comporteLiensSP: boolean;
	/** Titre de l'élément modificateur de l'article */
	modificatorTitle: null;
	/** Chronical ID de l'élément modificateur de l'article */
	modificatorCid: null;
	/** Date de modification par l'élément modificateur */
	modificatorDate: null;
	/** Version de l'article */
	articleVersion: string;
	/** Type */
	type: string;
	/** Liste des liens de modification */
	lstLienModification: any[];
	/** Liste des liens de citation. Toujours vide (voir propriété comporteLiens) */
	lstLienCitation: any[];
	/** Condition differée */
	conditionDiffere: null;
	/** Historique */
	historique: null;
	/** Surtitre */
	surtitre: null;
	/** Renvoi */
	renvoi: null;
	/** Version de l'article */
	versionLabel: null;
	/** Informations complémentaires */
	infosComplementaires: null;
	/** Texte HTML des informations complémentaires */
	infosComplementairesHtml: null;
	/** Informations restructuration de branche */
	infosRestructurationBranche: null;
	/** Texte HTML des informations restructuration de branche */
	infosRestructurationBrancheHtml: null;
	/** Date de début de l'article */
	dateDebut: number;
	/** Date de fin de l'article */
	dateFin: number;
	/** Liste de nota section à afficher */
	notaSectionsAafficher: null;
	/** Multiple versions */
	multipleVersions: boolean;
}

export interface JorfFileMetadatum {
	id: string;
	fileName: string;
	pathToFile: string;
	datePubli: number;
	num: string;
	complementNumber: string;
	type: string;
	size: number;
	displaySize: string;
	origine: string;
}
