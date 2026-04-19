Feature: Register

  # Validate the register form
  Scenario: Successful registration
    Given the register page is open
    When I register with a unique username and password
    Then I should be registered and redirected to the game page