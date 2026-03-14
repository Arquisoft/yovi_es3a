Feature: Register
  Validate the register form

  cenario: Successful registration
    Given the register page is open
    When I enter "Alice" as the username and submit
    Then I should see a welcome message containing "Hello Alice"