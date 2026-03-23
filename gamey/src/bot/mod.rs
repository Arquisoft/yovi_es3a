//! Infraestructura de bots para el juego Game of Y.
//!
//! Este módulo proporciona las definiciones de traits (interfaces)
//! y los registros necesarios para los bots de IA.

// Declaración de submódulos públicos que componen el sistema de bots

pub mod ybot;            // Contiene la definición principal del bot (trait e implementaciones base)
pub mod ybot_registry;   // Gestiona el registro de bots disponibles
pub mod factory;         // Implementa el patrón factory para crear instancias de bots
pub mod strategies;      // Define distintas estrategias de juego para los bots

// Reexportación de los elementos públicos de cada submódulo.
// Esto permite acceder a ellos directamente desde este módulo
// sin tener que referenciar cada submódulo por separado.

pub use ybot::*;
pub use ybot_registry::*;
pub use factory::*;
pub use strategies::*;