//! Registro para gestionar implementaciones de YBot.
//!
//! [`YBotRegistry`] proporciona una forma centralizada de registrar
//! y recuperar bots por nombre.

use std::{collections::HashMap, sync::Arc};

use crate::YBot;

/// Estructura que almacena y gestiona implementaciones de [`YBot`].
///
/// Permite registrar bots y recuperarlos dinámicamente por nombre,
/// facilitando la selección de bots en tiempo de ejecución.
///
/// # Ejemplo
///
/// ```
/// use std::sync::Arc;
/// use gamey::{YBotRegistry, RandomBot};
///
/// let registry = YBotRegistry::new()
///     .with_bot(Arc::new(RandomBot));
///
/// let bot = registry.find("random_bot");
/// assert!(bot.is_some());
/// ```
pub struct YBotRegistry {
    // Mapa de bots: nombre -> implementación del bot (compartida con Arc)
    bots: HashMap<String, Arc<dyn YBot>>,
}

impl YBotRegistry {
    /// Crea un nuevo registro vacío.
    pub fn new() -> Self {
        YBotRegistry {
            bots: HashMap::new(),
        }
    }

    /// Añade un bot al registro y devuelve el registro (permite encadenamiento).
    ///
    /// El bot se guarda usando su nombre (`YBot::name()`).
    pub fn with_bot(mut self, bot: Arc<dyn YBot>) -> Self {
        self.bots.insert(bot.name().to_string(), bot);
        self
    }

    /// Busca un bot por nombre.
    ///
    /// Devuelve `Some(bot)` si existe, o `None` si no se encuentra.
    pub fn find(&self, name: &str) -> Option<Arc<dyn YBot>> {
        // Se clona el Arc para compartir la referencia
        self.bots.get(name).cloned()
    }

    /// Devuelve los nombres de todos los bots registrados.
    pub fn names(&self) -> Vec<String> {
        self.bots.keys().cloned().collect()
    }

    /// Devuelve todos los bots registrados.
    pub fn get_all_bots(&self) -> Vec<Arc<dyn YBot>> {
        self.bots.values().cloned().collect()
    }

    /// Devuelve el número de bots registrados.
    pub fn count(&self) -> usize {
        self.bots.len()
    }
}

/// Implementación por defecto → crea un registro vacío.
impl Default for YBotRegistry {
    fn default() -> Self {
        YBotRegistry::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Coordinates, GameY, RandomBot};

    /// Bot simulado (mock) para pruebas.
    struct MockBot {
        name: String,
    }

    impl MockBot {
        fn new(name: &str) -> Self {
            MockBot {
                name: name.to_string(),
            }
        }
    }

    /// Implementación del trait YBot para el mock.
    impl YBot for MockBot {
        fn name(&self) -> &str {
            &self.name
        }

        // No hace nada: solo devuelve None
        fn choose_move(&self, _board: &GameY) -> Option<Coordinates> {
            None
        }

        fn difficulty(&self) -> &str {
            "N/A"
        }

        fn description(&self) -> &str {
            "Un bot de prueba (mock)."
        }
    }

    /// Comprueba que un registro nuevo está vacío.
    #[test]
    fn test_new_registry_is_empty() {
        let registry = YBotRegistry::new();
        assert!(registry.names().is_empty());
    }

    /// Comprueba que el registro por defecto también está vacío.
    #[test]
    fn test_default_registry_is_empty() {
        let registry = YBotRegistry::default();
        assert!(registry.names().is_empty());
    }

    /// Comprueba que añadir un bot funciona correctamente.
    #[test]
    fn test_with_bot_adds_bot() {
        let registry = YBotRegistry::new().with_bot(Arc::new(MockBot::new("test_bot")));

        assert_eq!(registry.names().len(), 1);
        assert!(registry.find("test_bot").is_some());
    }

    /// Comprueba el encadenamiento de llamadas `with_bot`.
    #[test]
    fn test_with_bot_chaining() {
        let registry = YBotRegistry::new()
            .with_bot(Arc::new(MockBot::new("bot1")))
            .with_bot(Arc::new(MockBot::new("bot2")));

        assert_eq!(registry.names().len(), 2);
        assert!(registry.find("bot1").is_some());
        assert!(registry.find("bot2").is_some());
    }

    /// Buscar un bot inexistente debe devolver None.
    #[test]
    fn test_find_nonexistent_bot_returns_none() {
        let registry = YBotRegistry::new();
        assert!(registry.find("nonexistent").is_none());
    }

    /// Comprueba que se puede registrar un bot real (RandomBot).
    #[test]
    fn test_with_random_bot() {
        let registry = YBotRegistry::new().with_bot(Arc::new(RandomBot));

        assert!(registry.find("random_bot").is_some());
    }

    /// Si se registran dos bots con el mismo nombre, el segundo sobrescribe al primero.
    #[test]
    fn test_duplicate_name_overwrites() {
        let bot1 = Arc::new(MockBot::new("same_name"));
        let bot2 = Arc::new(MockBot::new("same_name"));

        let registry = YBotRegistry::new().with_bot(bot1).with_bot(bot2);

        // Solo debe haber uno porque se sobrescribe
        assert_eq!(registry.names().len(), 1);
    }

    /// Comprueba el método count().
    #[test]
    fn test_registry_count() {
        let registry = YBotRegistry::new()
            .with_bot(Arc::new(MockBot::new("bot1")))
            .with_bot(Arc::new(MockBot::new("bot2")));
        
        assert_eq!(registry.count(), 2);
    }

    /// Comprueba el método get_all_bots().
    #[test]
    fn test_get_all_bots() {
        let registry = YBotRegistry::new()
            .with_bot(Arc::new(MockBot::new("bot1")))
            .with_bot(Arc::new(MockBot::new("bot2")));
        
        let bots = registry.get_all_bots();
        assert_eq!(bots.len(), 2);
        
        let names: Vec<&str> = bots.iter().map(|b| b.name()).collect();
        assert!(names.contains(&"bot1"));
        assert!(names.contains(&"bot2"));
    }
}