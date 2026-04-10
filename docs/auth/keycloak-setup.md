# Configurazione Keycloak per SPID/CIE/LDAP — Guida Implementativa

## Prerequisiti

- Keycloak 24.x+ (distribuzione Quarkus) su `login.asp.messina.it`
- Plugin `italia/spid-keycloak-provider` v2.x ([repository](https://github.com/italia/spid-keycloak-provider))
- Certificato RSA 2048+ bit per firma SAML (self-signed accettato per SPID)
- Codice IPA dell'ente (ASP Messina)
- Partita IVA o codice fiscale dell'ente

## Indice

1. [Installazione plugin SPID/CIE](#1-installazione-plugin-spidcie)
2. [Configurazione Realm](#2-configurazione-realm)
3. [Identity Provider SPID](#3-identity-provider-spid)
4. [Identity Provider CIE](#4-identity-provider-cie)
5. [Federazione LDAP](#5-federazione-ldap)
6. [Client OIDC per le applicazioni](#6-client-oidc-per-le-applicazioni)
7. [Mapper custom claims](#7-mapper-custom-claims)
8. [Certificati e firma](#8-certificati-e-firma)
9. [Metadata SP e conformita AGID](#9-metadata-sp-e-conformita-agid)
10. [Conformita alle specifiche SPID](#10-conformita-alle-specifiche-spid)
11. [Conformita alle specifiche CIE](#11-conformita-alle-specifiche-cie)
12. [Test e validazione](#12-test-e-validazione)
13. [Registrazione presso AGID e Min. Interno](#13-registrazione-presso-agid-e-min-interno)
14. [Logging e audit](#14-logging-e-audit)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Installazione plugin SPID/CIE

Il plugin `italia/spid-keycloak-provider` aggiunge i tipi Identity Provider "SPID" e "CIE" nella console admin di Keycloak.

### Con Docker (consigliato)

```dockerfile
FROM quay.io/keycloak/keycloak:24.0

# Copia il JAR del plugin
COPY spid-keycloak-provider-2.x.x.jar /opt/keycloak/providers/

# Build ottimizzato
RUN /opt/keycloak/bin/kc.sh build
```

### Manuale

```bash
# Scarica il JAR dalla release GitHub
wget https://github.com/italia/spid-keycloak-provider/releases/download/vX.X.X/spid-keycloak-provider-X.X.X.jar

# Copia nella directory providers di Keycloak
cp spid-keycloak-provider-*.jar /opt/keycloak/providers/

# Rebuild
/opt/keycloak/bin/kc.sh build
```

### Verifica installazione

Dopo il restart di Keycloak, nella console admin:
- Vai su **Identity Providers** → **Add provider**
- Devono apparire le voci **"SPID"** e **"CIE"** nella lista

---

## 2. Configurazione Realm

### Creazione realm

| Parametro | Valore |
| --------- | ------ |
| Name | `asp` |
| Display Name | `ASP Messina — Autenticazione` |
| Enabled | true |
| Login Theme | keycloak (o tema personalizzato) |

### Impostazioni realm

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| SSL required | `external` | HTTPS obbligatorio dall'esterno |
| User registration | false | Gli utenti arrivano da SPID/CIE/LDAP |
| Login with email | false | Login via username o IdP esterno |
| Remember me | false | Per sicurezza |
| Internationalization | enabled, default `it` | Interfaccia in italiano |

### URL risultanti

```text
Realm URL:        https://login.asp.messina.it/realms/asp
OIDC well-known:  https://login.asp.messina.it/realms/asp/.well-known/openid-configuration
JWKS:             https://login.asp.messina.it/realms/asp/protocol/openid-connect/certs
SPID Metadata:    https://login.asp.messina.it/realms/asp/spid/metadata
```

---

## 3. Identity Provider SPID

### 3.1 Configurazione generale

Nel realm, vai su **Identity Providers** → **Add provider** → **SPID**.

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Alias | `spid` | Identificativo interno |
| Display Name | `SPID` | Mostrato nel bottone login |
| Enabled | true | |
| Trust Email | true | Le email SPID sono verificate |
| First Login Flow | `first broker login` | Flusso per primo accesso |
| Sync Mode | `force` | Aggiorna attributi ad ogni login |

### 3.2 Impostazioni SPID specifiche

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Entity ID | `https://login.asp.messina.it/realms/asp` | EntityID del Service Provider |
| SPID Level | `https://www.spid.gov.it/SpidL2` | Livello 2 per servizi sanitari |
| Attribute Consuming Service Index | `0` | Indice nel metadata |
| Sign AuthnRequests | true | **Obbligatorio per SPID** |
| Signature Algorithm | `RSA_SHA256` | Minimo richiesto da AGID |
| Want Assertions Signed | true | **Obbligatorio** |
| Force Authentication | true | **Obbligatorio per SpidL2+** |
| Is Passive | false | **Sempre false per SPID** |
| NameID Format | `urn:oasis:names:tc:SAML:2.0:nameid-format:transient` | **Obbligatorio** |

### 3.3 Dati organizzazione (per metadata)

Questi dati vengono inclusi nel metadata XML del Service Provider, come richiesto da AGID.

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Organization Name | `Azienda Sanitaria Provinciale di Messina` | Nome ufficiale ente |
| Organization Display Name | `ASP Messina` | Nome breve |
| Organization URL | `https://www.asp.messina.it` | Sito istituzionale |
| IPA Code | `asl_me` | Codice IPA dell'ente (verificare su IndicePA) |
| VAT Number | `IT0xxxxxxxxxx` | Partita IVA dell'ente |
| Fiscal Code | `0xxxxxxxxxx` | CF dell'ente |
| Entity Type | `Public` | Ente pubblico |
| Contact Email | `spid@asp.messina.it` | Email tecnica/referente |
| Contact Phone | `+390901234567` | Telefono referente |

### 3.4 IdP SPID da abilitare

Il plugin pre-configura tutti gli IdP SPID ufficiali. Abilitarli tutti per produzione:

| IdP | Entity ID | Note |
| --- | --------- | ---- |
| Poste Italiane | `https://posteid.poste.it` | Il piu usato |
| Aruba | `https://loginspid.arubapec.it` | |
| InfoCert | `https://identity.infocert.it` | |
| Lepida | `https://id.lepida.it/idp/shibboleth` | |
| Namirial | `https://idp.namirialtsp.com/idp` | |
| Register | `https://spid.register.it` | |
| Sielte | `https://identity.sieltecloud.it` | |
| TIM | `https://login.id.tim.it/affwebservices/public/saml2sso` | |
| TeamSystem | `https://spid.teamsystem.com/idp` | |
| Etna Hitech | `https://id.eht.eu` | |
| IntesaID | `https://spid.intesa.it` | |
| InfoCamere | `https://loginspid.infocamere.it` | |

### 3.5 Mapper attributi SPID

Il plugin configura automaticamente i mapper per gli attributi SPID. Verificare che siano presenti:

| Attributo SPID | Attributo Keycloak | Note |
| -------------- | ------------------ | ---- |
| `name` | `firstName` | Nome |
| `familyName` | `lastName` | Cognome |
| `fiscalNumber` | `fiscalNumber` | CF con prefisso `TINIT-` |
| `email` | `email` | Email |
| `spidCode` | `spidCode` | Identificativo SPID univoco |
| `dateOfBirth` | `dateOfBirth` | Data nascita (YYYY-MM-DD) |
| `placeOfBirth` | `placeOfBirth` | Luogo nascita (cod. catastale) |
| `gender` | `gender` | M/F |

**IMPORTANTE — Prefisso `TINIT-`**: il `fiscalNumber` da SPID arriva come `TINIT-RSSMRA80A01F158K`. Serve un mapper o post-processing per rimuovere il prefisso e salvare solo il CF puro.

#### Mapper per rimozione prefisso TINIT

Creare un **Script Mapper** (o un mapper custom):

| Parametro | Valore |
| --------- | ------ |
| Name | `cf-strip-tinit` |
| Mapper Type | JavaScript |
| Script | vedi sotto |

```javascript
// Rimuove il prefisso TINIT- dal codice fiscale
var cf = user.getFirstAttribute('fiscalNumber');
if (cf && cf.startsWith('TINIT-')) {
  cf = cf.substring(6);
}
user.setSingleAttribute('codice_fiscale', cf.toUpperCase());
```

Oppure gestirlo lato Sails nel controller `get-token-spid.js`:

```javascript
let cf = payload.codice_fiscale || payload.fiscalNumber || '';
cf = cf.replace(/^TINIT-/i, '').toUpperCase();
```

### 3.6 Attributi richiesti nel metadata (AttributeConsumingService)

Configurare gli attributi richiesti nel metadata SP. Per i servizi ASP Messina:

**Set minimo obbligatorio:**

| Attributo | OID | Obbligatorio |
| --------- | --- | ------------ |
| `name` | `urn:oid:2.5.4.42` | Si |
| `familyName` | `urn:oid:2.5.4.4` | Si |
| `fiscalNumber` | `urn:oid:2.5.4.65` | Si |
| `email` | `urn:oid:0.9.2342.19200300.100.1.3` | Si |

**Set esteso (consigliato per servizi sanitari):**

| Attributo | Descrizione |
| --------- | ----------- |
| `dateOfBirth` | Data di nascita |
| `placeOfBirth` | Luogo di nascita |
| `gender` | Sesso |
| `mobilePhone` | Telefono cellulare |

---

## 4. Identity Provider CIE

### 4.1 Configurazione

Nel realm, vai su **Identity Providers** → **Add provider** → **CIE** (fornito dal plugin).

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Alias | `cie-id` | Identificativo interno |
| Display Name | `CIE` | Mostrato nel bottone login |
| Enabled | true | |
| Trust Email | true | |
| First Login Flow | `first broker login` | |
| Sync Mode | `force` | |

### 4.2 Impostazioni specifiche CIE

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Entity ID | `https://login.asp.messina.it/realms/asp` | Stesso SP di SPID |
| Authentication Level | `https://www.spid.gov.it/SpidL2` | CIE supporta solo L2 e L3 |
| Sign AuthnRequests | true | Obbligatorio |
| Signature Algorithm | `RSA_SHA256` | |
| Force Authentication | true | Obbligatorio per L2+ |

### 4.3 Endpoint CIE IdP

| Ambiente | Metadata URL |
| -------- | ------------ |
| **Produzione** | `https://idserver.servizicie.interno.gov.it/idp/shibboleth` |
| **Pre-produzione** | `https://preproduzione.idserver.servizicie.interno.gov.it/idp/shibboleth` |

### 4.4 Differenze rispetto a SPID

| Aspetto | SPID | CIE |
| ------- | ---- | --- |
| Numero IdP | 12+ (Poste, Aruba, etc.) | 1 (Ministero Interno) |
| Livelli auth | L1, L2, L3 | Solo L2, L3 |
| Registrazione SP | AGID (registro SPID) | Ministero Interno (Federazione CIE) |
| Attributi | Identici | Identici |
| Branding | "Entra con SPID" (bottone ufficiale) | "Entra con CIE" (bottone ufficiale) |
| Secondo fattore | OTP/app del provider | CIE fisica o app CIE id |

### 4.5 Mapper attributi CIE

Identici a SPID. Il `fiscalNumber` arriva anche qui con prefisso `TINIT-`.

---

## 5. Federazione LDAP

### 5.1 Configurazione

Nel realm, vai su **User Federation** → **Add provider** → **LDAP**.

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Console Display Name | `Active Directory ASP Messina` | |
| Vendor | `Active Directory` | |
| Connection URL | `ldap://192.168.250.78:389` | O `ldaps://` per SSL |
| Bind Type | `simple` | |
| Bind DN | `CN=svc-keycloak,OU=ServiceAccounts,DC=asp,DC=messina,DC=it` | Account di servizio |
| Bind Credential | `***` | Password account servizio |
| Edit Mode | `READ_ONLY` | LDAP sola lettura |

### 5.2 Ricerca utenti

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Users DN | `OU=Users,DC=asp,DC=messina,DC=it` | Base di ricerca |
| Username LDAP attribute | `sAMAccountName` | Login AD |
| UUID LDAP attribute | `objectGUID` | |
| User Object Classes | `person, organizationalPerson, user` | |
| Search Scope | `Subtree` | Cerca nelle sotto-OU |

### 5.3 Sincronizzazione

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Import Users | true | Importa in Keycloak |
| Periodic Full Sync | enabled, ogni 86400s (24h) | Sincronizzazione completa giornaliera |
| Periodic Changed Users Sync | enabled, ogni 3600s (1h) | Modifiche incrementali |

### 5.4 Mapper LDAP

I mapper di default vengono creati automaticamente. Verificare:

| LDAP Attribute | Keycloak Attribute | Note |
| -------------- | ------------------ | ---- |
| `sAMAccountName` | `username` | Login |
| `givenName` | `firstName` | Nome |
| `sn` | `lastName` | Cognome |
| `mail` | `email` | Email |

### 5.5 Claim custom `domain` per utenti LDAP

Creare un mapper hardcoded per aggiungere il dominio nel token JWT:

Vai su **User Federation** → **Active Directory ASP Messina** → **Mappers** → **Create**

| Parametro | Valore |
| --------- | ------ |
| Name | `ldap-domain` |
| Mapper Type | `hardcoded-ldap-attribute-idp-mapper` |

**In alternativa**, creare un Protocol Mapper a livello di client (vedi sezione 7).

---

## 6. Client OIDC per le applicazioni

Per ogni applicazione che si autentica tramite Keycloak, creare un client OIDC dedicato.

### 6.1 Client "cambio-medico" (servizio pubblico)

| Parametro | Valore |
| --------- | ------ |
| Client ID | `cambio-medico` |
| Name | `Cambio Medico — Accesso Cittadini` |
| Client Protocol | `openid-connect` |
| Access Type | `public` |
| Standard Flow | enabled |
| Direct Access Grants | disabled |
| Valid Redirect URIs | `https://cambiomedico.asp.messina.it/callback` |
| Web Origins | `https://cambiomedico.asp.messina.it` |
| Post Logout Redirect URIs | `https://cambiomedico.asp.messina.it` |

### 6.2 Client "portale-operatori" (utenti registrati)

| Parametro | Valore |
| --------- | ------ |
| Client ID | `portale-operatori` |
| Name | `Portale Operatori ASP` |
| Client Protocol | `openid-connect` |
| Access Type | `confidential` |
| Standard Flow | enabled |
| Service Accounts | enabled (se servono chiamate M2M) |
| Valid Redirect URIs | `https://ws.asp.messina.it/callback` |
| Web Origins | `https://ws.asp.messina.it` |

Nella tab **Credentials**: annotare il **Client Secret** (servira al backend).

### 6.3 Configurazione token

Per ogni client, tab **Advanced Settings**:

| Parametro | Valore | Note |
| --------- | ------ | ---- |
| Access Token Lifespan | 300 (5 min) | Breve, il backend emette il suo JWT |
| ID Token Lifespan | 300 (5 min) | |

Il token Keycloak serve solo per lo scambio iniziale. Dopo, il backend emette il proprio authtoken con durata piu lunga.

---

## 7. Mapper custom claims

Per ogni client, nella tab **Client Scopes** → **Dedicated scope** → **Mappers**, creare i seguenti mapper.

### 7.1 `app_name` (hardcoded per client)

| Parametro | Valore |
| --------- | ------ |
| Name | `app_name` |
| Mapper Type | **Hardcoded claim** |
| Token Claim Name | `app_name` |
| Claim value | `cambio-medico` (varia per client) |
| Claim JSON Type | `String` |
| Add to ID token | true |
| Add to access token | true |

### 7.2 `access_type` (hardcoded per client)

| Parametro | Valore |
| --------- | ------ |
| Name | `access_type` |
| Mapper Type | **Hardcoded claim** |
| Token Claim Name | `access_type` |
| Claim value | `public` o `registered` (varia per client) |
| Claim JSON Type | `String` |
| Add to ID token | true |
| Add to access token | true |

### 7.3 `domain` (hardcoded, solo per client con utenti LDAP)

| Parametro | Valore |
| --------- | ------ |
| Name | `domain` |
| Mapper Type | **Hardcoded claim** |
| Token Claim Name | `domain` |
| Claim value | `asp.messina.it` |
| Claim JSON Type | `String` |
| Add to ID token | true |
| Add to access token | true |

**Nota**: questo mapper va aggiunto **solo** ai client usati da utenti LDAP (es. `portale-operatori`). Non va nei client pubblici.

Per distinguere meglio: se lo stesso client puo essere usato sia da LDAP che da SPID, usare un **Conditional Mapper** o gestire la logica lato Sails (se `domain` e presente → LDAP, altrimenti → SPID/locale).

### 7.4 `codice_fiscale` (da attributo utente)

| Parametro | Valore |
| --------- | ------ |
| Name | `codice_fiscale` |
| Mapper Type | **User Attribute** |
| User Attribute | `codice_fiscale` |
| Token Claim Name | `codice_fiscale` |
| Claim JSON Type | `String` |
| Add to ID token | true |
| Add to access token | true |

**Prerequisito**: l'attributo `codice_fiscale` deve essere popolato. Per utenti SPID/CIE viene dalla SAML assertion (dopo strip del prefisso `TINIT-`). Per utenti LDAP va importato da AD se disponibile.

### 7.5 `identity_provider` (automatico)

Keycloak include automaticamente `identity_provider` nel token quando l'utente accede via un IdP esterno (SPID, CIE). Per renderlo esplicito nel token:

| Parametro | Valore |
| --------- | ------ |
| Name | `identity_provider` |
| Mapper Type | **User Session Note** |
| User Session Note | `identity_provider` |
| Token Claim Name | `identity_provider` |
| Claim JSON Type | `String` |
| Add to ID token | true |
| Add to access token | true |

### Riepilogo claims per tipo di client

**Client pubblico (es. `cambio-medico`):**

```json
{
  "iss": "https://login.asp.messina.it/realms/asp",
  "aud": "cambio-medico",
  "sub": "uuid-keycloak",
  "preferred_username": "RSSMRA80A01F158K",
  "given_name": "Mario",
  "family_name": "Rossi",
  "email": "mario.rossi@email.it",
  "identity_provider": "spid",
  "codice_fiscale": "RSSMRA80A01F158K",
  "app_name": "cambio-medico",
  "access_type": "public"
}
```

**Client registrato con LDAP (es. `portale-operatori`):**

```json
{
  "iss": "https://login.asp.messina.it/realms/asp",
  "aud": "portale-operatori",
  "sub": "uuid-keycloak",
  "preferred_username": "mrossi",
  "given_name": "Mario",
  "family_name": "Rossi",
  "email": "mrossi@asp.messina.it",
  "identity_provider": null,
  "domain": "asp.messina.it",
  "app_name": "portale-operatori",
  "access_type": "registered"
}
```

**Client registrato con SPID (es. `portale-operatori`):**

```json
{
  "iss": "https://login.asp.messina.it/realms/asp",
  "aud": "portale-operatori",
  "sub": "uuid-keycloak",
  "preferred_username": "RSSMRA80A01F158K",
  "given_name": "Mario",
  "family_name": "Rossi",
  "identity_provider": "spid",
  "codice_fiscale": "RSSMRA80A01F158K",
  "app_name": "portale-operatori",
  "access_type": "registered"
}
```

---

## 8. Certificati e firma

### 8.1 Generazione certificato SP

```bash
# Generazione chiave RSA 3072 bit + certificato self-signed (10 anni)
openssl req -x509 -newkey rsa:3072 \
  -keyout sp-key.pem -out sp-cert.pem \
  -sha256 -days 3650 -nodes \
  -subj "/C=IT/ST=Sicilia/L=Messina/O=ASP Messina/CN=login.asp.messina.it"
```

### 8.2 Import in Keycloak

1. Vai su **Realm Settings** → **Keys** → **Providers** → **Add Provider** → **rsa**
2. Carica la chiave privata (`sp-key.pem`) e il certificato (`sp-cert.pem`)
3. Imposta **Priority** alta (es. 200) per usarlo come chiave di default
4. Imposta **Algorithm**: `RS256`

### 8.3 Requisiti AGID per i certificati

| Requisito | Valore |
| --------- | ------ |
| Algoritmo chiave | RSA 2048 bit minimo (3072+ consigliato) |
| Algoritmo firma | SHA-256 minimo (`RSA_SHA256`) |
| CA | Self-signed accettato per SPID |
| Validita | Non scaduto |
| Uso | Firma AuthnRequest + incluso nel metadata SP |

### 8.4 Rotazione certificati

Quando si avvicina la scadenza:
1. Generare un nuovo certificato
2. Aggiungerlo in Keycloak con priority piu alta
3. Aggiornare il metadata SP presso AGID/Min. Interno
4. Attendere propagazione (qualche giorno)
5. Rimuovere il vecchio certificato

---

## 9. Metadata SP e conformita AGID

### 9.1 Generazione metadata

Il plugin genera automaticamente il metadata SP all'URL:

```text
https://login.asp.messina.it/realms/asp/spid/metadata
```

### 9.2 Struttura metadata richiesta

Il metadata XML deve contenere (il plugin li genera automaticamente se configurati):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
    xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    xmlns:spid="https://spid.gov.it/saml-extensions"
    entityID="https://login.asp.messina.it/realms/asp"
    ID="_xxxxxxxx">

  <!-- Firma digitale del metadata -->
  <ds:Signature>...</ds:Signature>

  <md:SPSSODescriptor
      AuthnRequestsSigned="true"
      WantAssertionsSigned="true"
      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">

    <!-- Certificato per firma -->
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo>
        <ds:X509Data>
          <ds:X509Certificate>MIIxx...base64...</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>

    <!-- Single Logout -->
    <md:SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://login.asp.messina.it/realms/asp/broker/spid/endpoint"/>
    <md:SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="https://login.asp.messina.it/realms/asp/broker/spid/endpoint"/>

    <!-- Assertion Consumer Service -->
    <md:AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://login.asp.messina.it/realms/asp/broker/spid/endpoint"
        index="0"
        isDefault="true"/>

    <!-- Attributi richiesti -->
    <md:AttributeConsumingService index="0">
      <md:ServiceName xml:lang="it">ASP Messina — Servizi Sanitari</md:ServiceName>
      <md:RequestedAttribute Name="name" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
      <md:RequestedAttribute Name="familyName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
      <md:RequestedAttribute Name="fiscalNumber" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
      <md:RequestedAttribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
      <md:RequestedAttribute Name="dateOfBirth" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic"/>
    </md:AttributeConsumingService>

  </md:SPSSODescriptor>

  <!-- Dati organizzazione -->
  <md:Organization>
    <md:OrganizationName xml:lang="it">Azienda Sanitaria Provinciale di Messina</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="it">ASP Messina</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="it">https://www.asp.messina.it</md:OrganizationURL>
  </md:Organization>

  <!-- Contatto tecnico/amministrativo con estensioni SPID -->
  <md:ContactPerson contactType="other">
    <md:Extensions>
      <spid:IPACode>asl_me</spid:IPACode>
      <spid:Public/>
      <spid:VATNumber>IT0xxxxxxxxxx</spid:VATNumber>
      <spid:FiscalCode>0xxxxxxxxxx</spid:FiscalCode>
    </md:Extensions>
    <md:EmailAddress>spid@asp.messina.it</md:EmailAddress>
    <md:TelephoneNumber>+390901234567</md:TelephoneNumber>
  </md:ContactPerson>

</md:EntityDescriptor>
```

### 9.3 Validazione metadata

Prima di inviare il metadata ad AGID, validarlo con `spid-saml-check` (vedi sezione 12).

---

## 10. Conformita alle specifiche SPID

### 10.1 Regole tecniche AGID

Le specifiche SPID sono pubblicate su: `https://docs.italia.it/italia/spid/spid-regole-tecniche/`

Il plugin `spid-keycloak-provider` implementa automaticamente la maggior parte dei requisiti. Verificare:

### 10.2 AuthnRequest — requisiti obbligatori

| Requisito | Implementato da | Verifica |
| --------- | --------------- | -------- |
| Firmata (RS256+) | Plugin + Keycloak signing key | spid-saml-check |
| `AssertionConsumerServiceURL` = metadata | Plugin | Automatico |
| `AttributeConsumingServiceIndex` presente | Plugin config | Verificare |
| `RequestedAuthnContext Comparison="exact"` | Plugin config (SPID Level) | Verificare |
| `NameIDFormat` = transient | Plugin | Automatico |
| `ForceAuthn="true"` per L2+ | Plugin config | Verificare abilitato |
| `IsPassive="false"` | Plugin | Automatico |
| `Destination` = SSO endpoint IdP | Plugin | Automatico |
| `IssueInstant` corrente (±2 min) | Keycloak | Verificare NTP sync |
| `ID` univoco (formato `_uuid`) | Keycloak | Automatico |

### 10.3 Validazione Response/Assertion

| Requisito | Implementato da |
| --------- | --------------- |
| Response firmata | Plugin + Keycloak SAML validation |
| Assertion firmata | Plugin |
| `InResponseTo` match | Plugin |
| `Destination` match | Plugin |
| `AudienceRestriction` contiene EntityID SP | Plugin |
| `NotOnOrAfter` verificato | Plugin |
| `Recipient` match | Plugin |

### 10.4 Single Logout (SLO) — obbligatorio

SPID richiede l'implementazione del Single Logout:

1. **SP-initiated**: l'utente clicca "Esci" → Keycloak invia LogoutRequest all'IdP
2. **IdP-initiated**: l'IdP richiede il logout → Keycloak gestisce

Il plugin gestisce entrambi i flussi. Verificare che i binding SLO siano presenti nel metadata.

### 10.5 Livelli di autenticazione SPID

| Livello | URI | Quando usarlo |
| ------- | --- | ------------- |
| SpidL1 | `https://www.spid.gov.it/SpidL1` | Consultazione informazioni pubbliche |
| **SpidL2** | `https://www.spid.gov.it/SpidL2` | **Servizi sanitari, cambio medico, dati personali** |
| SpidL3 | `https://www.spid.gov.it/SpidL3` | Firma digitale, operazioni ad alto rischio |

**Per ASP Messina: SpidL2 per tutti i servizi** (include OTP/2FA del provider SPID).

### 10.6 Codici errore SPID

L'applicazione deve gestire i codici errore restituiti dagli IdP SPID:

| Codice | Significato | Azione |
| ------ | ----------- | ------ |
| nr19 | Autenticazione fallita | Mostrare messaggio generico |
| nr20 | Livello SPID non sufficiente | Richiedere livello superiore |
| nr21 | Timeout sessione | Riprovare |
| nr22 | Utente ha negato il consenso | Informare e permettere retry |
| nr23 | Identita SPID sospesa | Contattare il provider SPID |
| nr25 | Annullato dall'utente | Permettere retry |

Keycloak gestisce questi errori e mostra pagine di errore. Personalizzare il tema per messaggi in italiano.

---

## 11. Conformita alle specifiche CIE

### 11.1 Differenze operative

CIE segue le stesse specifiche SAML di SPID con alcune particolarita:

| Aspetto | Specifica |
| ------- | --------- |
| Protocollo | SAML 2.0 (come SPID) |
| IdP unico | Ministero dell'Interno |
| Livelli | Solo L2 e L3 (il fattore fisico e la CIE stessa) |
| Metadata IdP | URL specifico (produzione/pre-produzione) |
| Registrazione SP | Portale Federazione CIE del Min. Interno |
| Attributi | Stessi di SPID (fiscalNumber con TINIT-) |

### 11.2 Configurazione aggiuntiva

Il metadata SP per CIE deve includere gli stessi dati di SPID (Organization, ContactPerson con estensioni). Il plugin gestisce le differenze automaticamente.

### 11.3 Branding

Utilizzare i bottoni ufficiali:
- **SPID**: "Entra con SPID" con logo ufficiale (disponibile su `https://github.com/italia/spid-sp-access-button`)
- **CIE**: "Entra con CIE" con logo ufficiale

Il plugin include gia il rendering dei bottoni SPID nel tema Keycloak.

---

## 12. Test e validazione

### 12.1 spid-saml-check (obbligatorio prima della produzione)

Tool ufficiale AGID per validare metadata e messaggi SAML.

```bash
# Avvio locale con Docker
docker run -d --name spid-saml-check \
  -p 8443:8443 \
  italia/spid-saml-check:latest
```

Accedere a `https://localhost:8443`:
1. Caricare il metadata SP (da `https://login.asp.messina.it/realms/asp/spid/metadata`)
2. Eseguire i test automatici (100+ controlli)
3. **Tutti i test devono passare** prima di richiedere la registrazione ad AGID

Controlli principali:
- Formato metadata XML valido
- Firma metadata corretta
- Attributi obbligatori presenti
- Organization e ContactPerson conformi
- AuthnRequest conforme
- Gestione Response/Assertion corretta
- Single Logout funzionante

### 12.2 SPID Test Environment

Per sviluppo, usare l'IdP di test AGID:

```bash
# spid-testenv2 — IdP mock locale
docker run -d --name spid-testenv \
  -p 8088:8088 \
  italia/spid-testenv2
```

Configurare in Keycloak come IdP SPID aggiuntivo:
- Entity ID: `https://localhost:8088`
- SSO URL: `https://localhost:8088/sso`
- SLO URL: `https://localhost:8088/slo`

Questo permette di testare il flusso completo senza credenziali SPID reali.

### 12.3 SPID Validator (demo AGID)

Disponibile online: `https://demo.spid.gov.it/validator`

Permette di validare il metadata e testare il flusso AuthnRequest/Response.

### 12.4 CIE Test Environment

| Ambiente | URL |
| -------- | --- |
| Pre-produzione | `https://preproduzione.idserver.servizicie.interno.gov.it` |
| Produzione | `https://idserver.servizicie.interno.gov.it` |

Per testare con CIE:
1. Registrare il SP in pre-produzione presso il Ministero dell'Interno
2. Usare una CIE di test o l'app CIE id in modalita test

### 12.5 Checklist test pre-produzione

- [ ] Metadata SP valido (`spid-saml-check` tutti i test passano)
- [ ] Login SPID funzionante con `spid-testenv2`
- [ ] Login CIE funzionante con ambiente pre-produzione
- [ ] Attributi SPID/CIE correttamente mappati (nome, cognome, CF)
- [ ] Prefisso `TINIT-` rimosso dal codice fiscale
- [ ] `identity_provider` presente nel token Keycloak
- [ ] Claims custom (`access_type`, `app_name`, `domain`) presenti nei token
- [ ] Single Logout funzionante
- [ ] Login LDAP funzionante con claim `domain`
- [ ] Pagine errore personalizzate in italiano
- [ ] Token Keycloak verificabile dal backend Sails via JWKS
- [ ] Endpoint `get-token-spid` funzionante per tutti e 4 gli scenari
- [ ] Log con tag `LOGIN_KEYCLOAK` registrato correttamente
- [ ] Rate limiting attivo sull'endpoint

---

## 13. Registrazione presso AGID e Min. Interno

### 13.1 Registrazione SPID

Per diventare Service Provider SPID ufficiale (ente pubblico):

1. **Prerequisito**: l'ente deve essere presente su IndicePA (`https://indicepa.gov.it`)
2. **Compilare la convenzione** AGID per SP pubblici
3. **Superare tutti i test** `spid-saml-check`
4. **Inviare il metadata** SP ad AGID tramite il portale dedicato
5. **AGID valida** il metadata e lo inserisce nel registro SPID
6. **Tutti gli IdP SPID** iniziano ad accettare le AuthnRequest dal tuo SP

Tempi indicativi: 2-4 settimane dopo l'invio del metadata.

### 13.2 Registrazione CIE

1. Accedere al **portale Federazione CIE** del Ministero dell'Interno
2. Registrare il Service Provider con il metadata
3. Testare in pre-produzione
4. Richiedere il passaggio in produzione

### 13.3 Documenti necessari

| Documento | Per SPID | Per CIE |
| --------- | -------- | ------- |
| Determina/delibera dell'ente | Si | Si |
| Codice IPA | Si | Si |
| Metadata SP XML | Si | Si |
| Certificato SP (X509) | Si | Si |
| Referente tecnico (email + tel) | Si | Si |
| Informativa privacy | Si | Si |

---

## 14. Logging e audit

### 14.1 Requisiti AGID

AGID richiede che i Service Provider mantengano log di tutte le autenticazioni SPID per almeno **24 mesi**.

I log devono includere:

| Campo | Descrizione |
| ----- | ----------- |
| Timestamp | Data/ora della richiesta |
| SP EntityID | EntityID del Service Provider |
| IdP EntityID | EntityID dell'Identity Provider |
| Request ID | ID univoco della AuthnRequest |
| Response Status | Successo o codice errore |
| spidCode | Identificativo SPID dell'utente |
| SPID Level | Livello di autenticazione usato |

### 14.2 Logging su Keycloak

Keycloak logga automaticamente tutti gli eventi di autenticazione. Configurare:

1. Vai su **Realm Settings** → **Events**
2. **Login Events**: enabled
3. **Save Events**: true
4. **Expiration**: 730 days (24 mesi)
5. **Event Types**: abilitare almeno `LOGIN`, `LOGIN_ERROR`, `LOGOUT`, `IDENTITY_PROVIDER_LOGIN`

### 14.3 Logging su Sails (asp-ws)

Ogni login via Keycloak viene loggato nel database `log` con tag `LOGIN_KEYCLOAK` (vedi documento `keycloak-spid.md`). Assicurarsi che la retention dei log sia di almeno 24 mesi.

### 14.4 GDPR

I dati SPID/CIE sono dati personali. Assicurarsi che:
- L'informativa privacy menzioni l'uso di SPID/CIE
- I log siano accessibili solo al personale autorizzato
- La retention sia conforme (24 mesi per AGID, poi cancellazione)
- L'utente possa esercitare i diritti GDPR (accesso, cancellazione)

---

## 15. Troubleshooting

### Problemi comuni

| Problema | Causa | Soluzione |
| -------- | ----- | --------- |
| "Invalid signature" su AuthnRequest | Certificato errato o non corrispondente al metadata | Verificare che il certificato in Keycloak sia lo stesso del metadata |
| "Invalid audience" sulla Response | EntityID SP non corrisponde | Verificare che `entityID` nel metadata = quello configurato nell'IdP |
| `fiscalNumber` vuoto | Mapper non configurato o attributo non richiesto | Verificare `AttributeConsumingService` nel metadata |
| Token senza `identity_provider` | Mapper User Session Note mancante | Aggiungere il mapper (sezione 7.5) |
| Token senza `codice_fiscale` | Attributo non mappato da SPID o prefisso non rimosso | Verificare mapper attributi SPID e script strip TINIT |
| Login LDAP ok ma senza claim `domain` | Mapper hardcoded mancante sul client | Aggiungere il mapper (sezione 7.3) |
| NTP out of sync → AuthnRequest rifiutata | Clock del server non sincronizzato | `timedatectl set-ntp true` |
| Metadata non raggiungibile dall'IdP | Firewall o DNS | Verificare che l'URL metadata sia pubblico |
| SLO non funzionante | Binding mancante nel metadata | Verificare `SingleLogoutService` nel metadata |

### Comandi utili

```bash
# Verificare il metadata SP
curl -s https://login.asp.messina.it/realms/asp/spid/metadata | xmllint --format -

# Verificare il JWKS endpoint
curl -s https://login.asp.messina.it/realms/asp/protocol/openid-connect/certs | jq .

# Verificare il well-known OIDC
curl -s https://login.asp.messina.it/realms/asp/.well-known/openid-configuration | jq .

# Decodificare un JWT (senza verifica)
echo "eyJhbG..." | cut -d. -f2 | base64 -d 2>/dev/null | jq .

# Verificare la sincronizzazione NTP
timedatectl status
```
