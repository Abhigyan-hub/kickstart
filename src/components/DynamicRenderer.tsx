import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// ==========================================
// 1. DEFINE YOUR UI BLOCKS
// ==========================================

const Banner = ({ title, color }: { title: string, color: string }) => (
  <View style={[styles.banner, { backgroundColor: color }]}>
    <Text style={styles.bannerText}>{title}</Text>
  </View>
);

const ActionButton = ({ text, action }: { text: string, action: string }) => (
  <TouchableOpacity 
    style={styles.button}
    onPress={() => {
      // Later, you can tie this to React Navigation based on the 'action' string
      console.log(`SDUI Trigger: Navigating to ${action}`);
    }}
  >
    <Text style={styles.buttonText}>{text}</Text>
  </TouchableOpacity>
);

// ==========================================
// 2. COMPONENT REGISTRY (THE MAP)
// ==========================================
// This dictionary maps the string from your FastAPI JSON to the React components above.

const ComponentRegistry: Record<string, React.FC<any>> = {
  Banner: Banner,
  Button: ActionButton,
};

// ==========================================
// 3. THE RENDERER
// ==========================================

interface DynamicRendererProps {
  // This expects the array of components fetched from your FastAPI backend
  schema: Array<{
    type: string;
    props: any;
  }>;
}

export default function DynamicRenderer({ schema }: DynamicRendererProps) {
  return (
    <View style={styles.container}>
      {schema.map((block, index) => {
        // Find the matching component in the registry
        const Component = ComponentRegistry[block.type];
        
        // Safety Fallback: If the DB sends a component type that doesn't exist in the app yet, 
        // ignore it instead of crashing the whole screen.
        if (!Component) {
          console.warn(`SDUI Warning: Unknown component type '${block.type}' skipped.`);
          return null; 
        }
        
        // Render the component and pass the JSON props directly to it
        return <Component key={index} {...block.props} />;
      })}
    </View>
  );
}

// ==========================================
// 4. STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    gap: 16, // Adds spacing between all dynamic elements
  },
  banner: { 
    padding: 24, 
    borderRadius: 16, 
    marginBottom: 16,
    shadowOffset: { width: 4, height: 8 }, 
    shadowOpacity: 0.15, 
    shadowRadius: 10, 
    elevation: 8 
  },
  bannerText: { 
    color: '#FFFFFF', 
    fontSize: 20, 
    fontWeight: '900',
    letterSpacing: 0.5 
  },
  button: { 
    padding: 16, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E4DDD3',
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2 
  },
  buttonText: { 
    color: '#000000', 
    fontWeight: '800', 
    textAlign: 'center',
    fontSize: 16 
  },
});