// Referência do formato que a ponte.py espera: "ldr,pir" por linha, 9600 baud.
// Se o seu código já imprime LDR e PIR (nessa ordem) numa linha, não precisa trocar.
const int PINO_LDR = A0;      // ajuste para o seu circuito
const int PINO_PIR = 2;       // ajuste para o seu circuito
const int LED_VERDE = 8;
const int LED_VERMELHO = 9;

void setup() {
  pinMode(PINO_PIR, INPUT);
  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_VERMELHO, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int ldr = analogRead(PINO_LDR);
  int pir = digitalRead(PINO_PIR);
  digitalWrite(LED_VERDE, ldr < 400);
  digitalWrite(LED_VERMELHO, pir);
  Serial.print(ldr);
  Serial.print(',');
  Serial.println(pir);
  delay(500);
}
