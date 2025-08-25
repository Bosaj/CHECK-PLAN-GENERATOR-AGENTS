# CHECK PLAN GENERATOR - CDG Capital

Ce projet permet de déployer des agents qui, à partir des règlements de gestion, génèrent un plan de contrôle au format Excel.
Il comprend deux modules principaux :

* **L’agent générateur** : produit le plan de contrôle.
* **L’agent vérificateur** : contrôle la qualité du plan généré.

## Configurations

### 1 - Sans Docker

```bash
python3.11.9 -m venv .venv

cd check-planner
./.venv/Scripts/activate  # Windows

pip install -r requirements.txt
```

**Lancer le service backend**

```bash
uvicorn check_planner:app --host 0.0.0.0 --port 8057 --reload
```

### 2 - Avec Docker

```bash
# Ubuntu ou Docker Desktop
docker-compose up -d
```

## Clients SDK

* Client Python : `clients/python-sdk`
* Client JavaScript : `clients/javascript-sdk`

## Exemples

* Exemples d’utilisation des clients frontend pour consommer l’intégralité du service.

## Licence

Ce projet est une propriété privée sous la supervision de **CDG Capital**.

**Développeurs** :

* Adama Coulibaly
* Hamza Idrissi
* Oussama Elhadji
* Chaymae