Feature: Login

  # Validate the login form
  Scenario: Successful login
    Given the login page is open
    When I login with username "Manolo", with "manolo" as the password and submit
    Then I should be logged in and redirected to the game page