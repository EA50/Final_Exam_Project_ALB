import os
import pandas as pd
import csv

class Tables:

    def __init__(self, dir):
        self.recent_schedule = ''
        self.invalid_schedules = {}
        self.dir = dir
        self.files_list = os.listdir(self.dir)
        self.tables_array = []
        self.tables_array_removed_nan = []
        self.main_table = pd.read_excel('./maintable/template.xlsx', index_col=0)
        self.main_table_removed_nan = self.main_table.fillna('')
        self.tables_are_merged = True

    def convert_to_df(self):
        for i in sorted(self.files_list):
            new_df = pd.read_excel(f'{self.dir}/{i}', index_col=0)
            self.tables_array.append(new_df)

    def remove_nan_values(self):
        for i in self.tables_array:
            new_df_removed_nan = i.fillna('')
            self.tables_array_removed_nan.append(new_df_removed_nan)

    def to_exports(self, is_merged):
        os.makedirs('exports', exist_ok=True)  

        if is_merged:
            merged = self.main_table_removed_nan
            merged.to_csv('exports/merged.csv', index=False)
        else:
            invalid = pd.DataFrame(self.invalid_schedules)
            invalid.to_csv('exports/invalid.csv', index=False)

    def verify_tables_are_merged(self):

        for i in self.invalid_schedules.keys():
            if len(self.invalid_schedules[i]) != 0:
                self.extend_arrays()
                self.to_exports(False)
                break
        self.to_exports(True)

    def extend_arrays(self):
        max_len = max(len(arr) for arr in self.invalid_schedules.values())
        for key, arr in self.invalid_schedules.items():
            while len(arr) < max_len:
                arr.append('')

T = Tables("./queuefiles")

T.convert_to_df()
T.remove_nan_values()


# table = what table to compare with against the basis table
# at = time (i.e. 915)
def compare(table, at):
    for j in range(1, 67):
        if T.main_table_removed_nan.loc[j, at] != '':

            if table.loc[j, at] != '':

                # show  f'invalid schedule at: {T.main_table_removed_nan.loc[0, at]} {T.main_table_removed_nan.loc[j, 0]}'
                if T.recent_schedule in T.invalid_schedules.keys():
                    T.invalid_schedules[T.recent_schedule].append(f'{T.main_table_removed_nan.loc[0, at]} {T.main_table_removed_nan.loc[j, 0]}')
                else:
                    T.invalid_schedules[T.recent_schedule] = []
                    T.invalid_schedules[T.recent_schedule].append(f'{T.main_table_removed_nan.loc[0, at]} {T.main_table_removed_nan.loc[j, 0]}')

                continue

            continue
        else:
            if T.recent_schedule in T.invalid_schedules.keys():
                pass
            else:
                T.invalid_schedules[T.recent_schedule] = []
            T.main_table_removed_nan.loc[j, at] = table.loc[j, at]

# ITERATE THROUGH TABLE 1 UNTIL TABLE N FROM MONDAY (1) TO SATURDAY (7)
# N = how many tables stored in the array
for i, table in enumerate(T.tables_array_removed_nan):
    T.recent_schedule = f'Invalid_Sched_for_Table: {i+1}'

    for day in range(1, 7):
        compare(table, day)

# print(T.main_table)

T.verify_tables_are_merged()


# replace "False" values in the csv to an empty string

def remove_specific_values_from_csv(input_filename, output_filename, specific_value):
    # Read the CSV file
    with open(input_filename, mode='r') as file:
        reader = csv.reader(file)
        data = list(reader)
    
    # Modify the data
    for row in data:
        for i, cell in enumerate(row):
            if cell == specific_value:
                row[i] = ''
                
    # Write the modified data to a new CSV file
    with open(output_filename, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(data)

# Usage
remove_specific_values_from_csv('exports/merged.csv', 'exports/mergeddd.csv', False)
print(1)



