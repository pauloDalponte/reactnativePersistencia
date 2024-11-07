
import { useState, useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  List,
  PaperProvider,
  Switch,
  Text,
  MD3LightTheme as DefaultTheme,
} from "react-native-paper";
import myColors from "./assets/colors.json";
import myColorsDark from "./assets/colorsDark.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from 'expo-sqlite';
import * as Location from 'expo-location';
import { insertLocation, getAllLocations } from './db'; 


export default function App() {
  const [isSwitchOn, setIsSwitchOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locations, setLocations] = useState([]);

  const [theme, setTheme] = useState({
    ...DefaultTheme,
    myOwnProperty: true,
    colors: myColors.colors,
  });

  // Carrega o tema do AsyncStorage
  async function loadDarkMode() {
    try {
      const storedTheme = await AsyncStorage.getItem('theme');
      if (storedTheme === 'dark') {
        setIsSwitchOn(true);
        setTheme({ ...theme, colors: myColorsDark.colors });
      } else {
        setIsSwitchOn(false);
        setTheme({ ...theme, colors: myColors.colors });
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
    }
  }

  // Salva a preferência de tema no AsyncStorage
  async function saveDarkMode(isDarkMode) {
    try {
      await AsyncStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  }

  // Evento de troca do tema
  async function onToggleSwitch() {
    const newSwitchState = !isSwitchOn;
    setIsSwitchOn(newSwitchState);
    saveDarkMode(newSwitchState);
  }

  // Carrega localizações do banco SQLite
  async function loadLocations() {
    setIsLoading(true);
  
    try {
      const dbLocations = await getAllLocations();
      console.log(dbLocations); // Verifique o que está sendo retornado aqui
  
      // Verifica se dbLocations e dbLocations.rows._array existem
      if (dbLocations && dbLocations.rows && Array.isArray(dbLocations.rows._array)) {
        setLocations(dbLocations.rows._array);
      } else {
        console.error('Estrutura de dados inesperada:', dbLocations);
      }
    } catch (error) {
      console.error("Erro ao carregar localizações:", error);
    } finally {
      setIsLoading(false);
    }
  }
  

  // Captura localização e salva no banco de dados
  async function getLocationAndSave() {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      console.log('Permissão de localização negada');
      return;
    }

    setIsLoading(true);

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      
      const data = { latitude, longitude };
      await insertLocation(data);

      // Atualiza a lista de localizações com a nova localização capturada
      setLocations(prevLocations => [
        { id: Date.now(), ...data },
        ...prevLocations,
      ]);
    } catch (error) {
      console.error('Erro ao salvar a localização:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDarkMode();
    loadLocations();
  }, []);

  useEffect(() => {
    setTheme(isSwitchOn ? { ...theme, colors: myColorsDark.colors } : { ...theme, colors: myColors.colors });
  }, [isSwitchOn]);

  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="App Localizacao" />
      </Appbar.Header>
      <View style={{ backgroundColor: theme.colors.background }}>
        <View style={styles.containerDarkMode}>
          <Text>Dark Mode</Text>
          <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />
        </View>
        <Button
          style={styles.containerButton}
          icon="map"
          mode="contained"
          loading={isLoading}
          onPress={() => getLocationAndSave()}
        >
          Capturar localização
        </Button>

        <FlatList
          style={styles.containerList}
          data={locations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <List.Item
              title={`Localização ${item.id}`}
              description={`Latitude: ${item.latitude} | Longitude: ${item.longitude}`}
            />
          )}
        />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  containerDarkMode: {
    margin: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  containerButton: {
    margin: 10,
  },
  containerList: {
    margin: 10,
    height: "100%",
  },
});
