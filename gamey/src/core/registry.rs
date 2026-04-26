use std::collections::HashMap;
use crate::core::Game;

/// Registro central de prototipos de juego.
/// Permite registrar instancias de juegos configuradas y clonarlas bajo demanda.
pub struct GameRegistry {
    prototypes: HashMap<String, Box<dyn Game>>,
}

impl Default for GameRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl GameRegistry {
    /// Crea un nuevo registro vacío.
    pub fn new() -> Self {
        Self {
            prototypes: HashMap::new(),
        }
    }

    /// Registra un nuevo prototipo de juego.
    pub fn register(&mut self, name: &str, prototype: Box<dyn Game>) {
        self.prototypes.insert(name.to_string(), prototype);
    }

    /// Crea una nueva instancia de un juego clonando su prototipo.
    pub fn create_game(&self, name: &str) -> Option<Box<dyn Game>> {
        self.prototypes.get(name).map(|p| p.clone_box())
    }

    /// Devuelve los nombres de todos los juegos registrados.
    pub fn available_games(&self) -> Vec<String> {
        self.prototypes.keys().cloned().collect()
    }
}
