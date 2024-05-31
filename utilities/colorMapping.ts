// utilities/colorMapping.ts

export const getColorForClassification = (classification: 'pass' | 'fail' | 'pending'): string => {
    switch (classification) {
      case 'pass':
        return 'green';
      case 'fail':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return '';
    }
  };
  