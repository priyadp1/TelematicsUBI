/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createDriverFeature = /* GraphQL */ `
  mutation CreateDriverFeature(
    $input: CreateDriverFeatureInput!
    $condition: ModelDriverFeatureConditionInput
  ) {
    createDriverFeature(input: $input, condition: $condition) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      __typename
    }
  }
`;
export const updateDriverFeature = /* GraphQL */ `
  mutation UpdateDriverFeature(
    $input: UpdateDriverFeatureInput!
    $condition: ModelDriverFeatureConditionInput
  ) {
    updateDriverFeature(input: $input, condition: $condition) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      __typename
    }
  }
`;
export const deleteDriverFeature = /* GraphQL */ `
  mutation DeleteDriverFeature(
    $input: DeleteDriverFeatureInput!
    $condition: ModelDriverFeatureConditionInput
  ) {
    deleteDriverFeature(input: $input, condition: $condition) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      __typename
    }
  }
`;
export const createTripEvent = /* GraphQL */ `
  mutation CreateTripEvent(
    $input: CreateTripEventInput!
    $condition: ModelTripEventConditionInput
  ) {
    createTripEvent(input: $input, condition: $condition) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const updateTripEvent = /* GraphQL */ `
  mutation UpdateTripEvent(
    $input: UpdateTripEventInput!
    $condition: ModelTripEventConditionInput
  ) {
    updateTripEvent(input: $input, condition: $condition) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const deleteTripEvent = /* GraphQL */ `
  mutation DeleteTripEvent(
    $input: DeleteTripEventInput!
    $condition: ModelTripEventConditionInput
  ) {
    deleteTripEvent(input: $input, condition: $condition) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      __typename
    }
  }
`;
