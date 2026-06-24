


CREATE TABLE GameSession (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    current_node_id INT NOT NULL,
    current_location INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_played TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE PlayerStats (
    stat_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    health INT NOT NULL,
    sanity INT NOT NULL,
    reputation INT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES GameSession(session_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Location (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_hidden BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB;

CREATE TABLE StoryNode (
    node_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    narrative_text TEXT NOT NULL,
    location_id INT NOT NULL,
    FOREIGN KEY (location_id) REFERENCES Location(location_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Add foreign key from GameSession to StoryNode after StoryNode is created
ALTER TABLE GameSession
    ADD FOREIGN KEY (current_node_id) REFERENCES StoryNode(node_id),
    ADD FOREIGN KEY (current_location) REFERENCES Location(location_id);

CREATE TABLE Choice (
    choice_id INT AUTO_INCREMENT PRIMARY KEY,
    node_id INT NOT NULL,
    choice_text VARCHAR(255) NOT NULL,
    next_node_id INT NOT NULL,
    FOREIGN KEY (node_id) REFERENCES StoryNode(node_id) ON DELETE CASCADE,
    FOREIGN KEY (next_node_id) REFERENCES StoryNode(node_id)
) ENGINE=InnoDB;

CREATE TABLE Consequence (
    consequence_id INT AUTO_INCREMENT PRIMARY KEY,
    choice_id INT NOT NULL,
    effect_type ENUM('health','sanity','reputation','item','flag') NOT NULL,
    reference_id INT,          -- could be item_id, stat_id, etc. (nullable)
    effect_value INT NOT NULL, -- amount to add/subtract, or quantity for item
    FOREIGN KEY (choice_id) REFERENCES Choice(choice_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE Item (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    item_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_consumable BOOLEAN DEFAULT FALSE
) ENGINE=InnoDB;

CREATE TABLE Inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (session_id) REFERENCES GameSession(session_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES Item(item_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE PlayerChoice (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    choice_id INT NOT NULL,
    chosen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES GameSession(session_id) ON DELETE CASCADE,
    FOREIGN KEY (choice_id) REFERENCES Choice(choice_id)
) ENGINE=InnoDB;

CREATE TABLE SaveSlot (
    save_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    save_name VARCHAR(100) NOT NULL,
    saved_node_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES GameSession(session_id) ON DELETE CASCADE,
    FOREIGN KEY (saved_node_id) REFERENCES StoryNode(node_id)
) ENGINE=InnoDB;

CREATE TABLE GameLog (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES GameSession(session_id) ON DELETE CASCADE
) ENGINE=InnoDB;