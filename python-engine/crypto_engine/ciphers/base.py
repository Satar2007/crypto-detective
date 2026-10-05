from abc import ABC, abstractmethod


class Cipher(ABC):
    name: str

    @abstractmethod
    def encrypt(self, plaintext: str, key):
        raise NotImplementedError

    @abstractmethod
    def decrypt(self, ciphertext: str, key):
        raise NotImplementedError
