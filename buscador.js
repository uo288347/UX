const pageMapping = {
  'nav.': { name: 'Navegación', url: null }, // No mostrar resultados de navegación
  'about.': { name: 'Sobre mí', url: 'index.html' },
  'hobbies.': { name: 'Aficiones', url: 'aficiones.html' },
  'travels.': { name: 'Viajes', url: 'viajes.html' },
  'experience.': { name: 'Experiencia', url: 'experiencia.html' },
  'search.': { name: 'Buscador', url: null }, // No mostrar resultados del buscador
  'lang.': { name: 'Idioma', url: null } // No mostrar resultados de idioma
};

// Se obtiene la información de las páginas en base a su clave i18n
function getPageInfo(key) {
  for (const [prefix, pageInfo] of Object.entries(pageMapping)) {
    if (key.startsWith(prefix)) {
      return pageInfo;
    }
  }
  return { name: 'Sobre mí', url: 'index.html' }; // Por defecto index.html
}

// Buscar en los mensajes de i18n
function searchInTranslations(query, lang = 'es') {
  const results = [];
  const searchTerm = query.toLowerCase().trim();
  
  if (!translations || !translations[lang]) {
    return results;
  }

  const trans = translations[lang];
  const seenContexts = new Set(); // Se usa set para evitar contextos duplicados
  
  for (const [key, value] of Object.entries(trans)) {
    if (typeof value === 'string' && value.toLowerCase().includes(searchTerm)) {
      const pageInfo = getPageInfo(key);
      
      // Saltar si no tiene URL (navegación, buscador, etc.)
      if (!pageInfo.url) {
        continue;
      }

      // Se crean entradas separadas para cada aparición del valor buscado
      const valueLower = value.toLowerCase();
      let startIndex = 0;
      
      while ((startIndex = valueLower.indexOf(searchTerm, startIndex)) !== -1) {
        // Crear contexto en función del valor encontrado
        const contextStart = Math.max(0, startIndex - 50);
        const contextEnd = Math.min(value.length, startIndex + searchTerm.length + 50);
        let context = value.substring(contextStart, contextEnd);
        
        context = context.replace(/\s+/g, ' ').trim();
        
        const beforeTerm = value.substring(contextStart, startIndex);
        const beforeTermCleaned = beforeTerm.replace(/\s+/g, ' ').trim();
        const adjustedPosition = beforeTermCleaned.length;
        
        // Agregar puntos suspensivos si es necesario
        let finalPosition = adjustedPosition;
        if (contextStart > 0) {
          context = '...' + context;
          finalPosition += 3; 
        }
        if (contextEnd < value.length) {
          context = context + '...';
        }

        // Crear clave única para evitar duplicados de contexto
        const contextKey = `${pageInfo.url}|${context}`;
        
        if (!seenContexts.has(contextKey)) {
          seenContexts.add(contextKey);
          
          results.push({
            page: pageInfo.name,
            url: pageInfo.url,
            context: context,
            searchTerm: searchTerm,
            key: key,
            position: startIndex,
            contextPosition: finalPosition 
          });
        }

        startIndex += searchTerm.length;
      }
    }
  }

  return results;
}

// Mostrar resultados
function displayResults(results) {
  const resultsContainer = document.querySelector('[data-search-results]');
  
  if (!resultsContainer) return;

  if (results.length === 0) {
    resultsContainer.innerHTML = `
      <p data-search-element="no-results" data-i18n="search.no.results">No se encontraron resultados</p>
    `;
    resultsContainer.style.display = 'block';
    updatePageLanguage(getCurrentLanguage());
    return;
  }

  let html = '<ul data-search-element="results-list">';
  
  for (const result of results) {
    const escapedTerm = escapeRegExp(result.searchTerm);
    let highlightedContext = result.context;
    
    // Encontrar la posición exacta del valor buscado en el contexto
    const regex = new RegExp(escapedTerm, 'gi');
    let match;
    let matchCount = 0;
    let targetMatch = null;
    
    // Buscar todas las coincidencias y encontrar cuál está más cerca de contextPosition
    while ((match = regex.exec(result.context)) !== null) {
      if (Math.abs(match.index - result.contextPosition) < 5) { // Tolerancia de 5 caracteres
        targetMatch = match;
        break;
      }
    }
    
    // Resaltar solo la coincidencia específica
    if (targetMatch) {
      highlightedContext = 
        result.context.substring(0, targetMatch.index) +
        '<mark>' + result.context.substring(targetMatch.index, targetMatch.index + targetMatch[0].length) + '</mark>' +
        result.context.substring(targetMatch.index + targetMatch[0].length);
    }

    // Añadir un elemento de una lista para cada resultado con un enlace a la página correspondiente
    html += `
      <li data-search-element="result-item" data-context-position="${result.contextPosition}">
        <p data-search-element="result-page">
          <a href="${result.url}">${result.page}</a>
        </p>
        <p data-search-element="result-context">${highlightedContext}</p>
      </li>
    `;
  }
  
  // Añadir número total de resultados encontrados
  html += '</ul>';
  html = `<p data-search-element="results-count"><span data-i18n="search.results.count">Resultados encontrados:</span> ${results.length}</p>` + html;
  
  resultsContainer.innerHTML = html;
  resultsContainer.style.display = 'block';
  updatePageLanguage(getCurrentLanguage());
}

// Escapar caracteres especiales para RegExp
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Inicializar búsqueda
function initializeSearch() {
  const searchInput = document.querySelector('input[type="search"][aria-label="Buscar"]');
  const resultsContainer = document.querySelector('[data-search-results]');
  
  if (!searchInput || !resultsContainer) return;

  // Búsqueda en tiempo real 
  searchInput.addEventListener('input', function(e) {
    const query = e.target.value;
    
    if (query.trim().length < 1) {
      resultsContainer.style.display = 'none';
      return;
    }

    const currentLang = getCurrentLanguage();
    const results = searchInTranslations(query, currentLang);
    displayResults(results);
  });

  // Cerrar resultados al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.style.display = 'none';
    }
  });

  // Mostrar resultados al enfocar si hay búsqueda
  searchInput.addEventListener('focus', function() {
    if (searchInput.value.trim().length >= 1) {
      resultsContainer.style.display = 'block';
    }
  });
}

// Inicializar cuando se carga el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSearch);
} else {
  initializeSearch();
}
